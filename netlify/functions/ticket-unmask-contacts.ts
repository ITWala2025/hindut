/**
 * netlify/functions/ticket-unmask-contacts.ts
 *
 * Authenticated admin endpoint to decrypt and unmask attendee contact information
 * (email and phone) for all existing and newly imported ticket bookings.
 *
 * It uses:
 *   1. Supabase RPC `decrypt_and_unmask_ticket_bookings` with RSVP_ENCRYPTION_KEY.
 *   2. Stripe PaymentIntent reconciliation as fallback for any rows with missing contacts.
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { resolveStripe } from './lib/stripe.js'

export const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const encKey = process.env.RSVP_ENCRYPTION_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[ticket-unmask-contacts] Supabase env vars missing')
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Server configuration error' }),
    }
  }

  try {
    // 1. Verify caller's JWT & permissions
    const token = (event.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    if (!token) {
      return {
        statusCode: 401,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Unauthorised' }),
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws as any },
    })

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return {
        statusCode: 401,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Unauthorised' }),
      }
    }

    const { data: roleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role: string | undefined =
      (roleRow?.role as string | undefined) ||
      (user.app_metadata?.role as string | undefined)

    if (!role || (role !== 'super_admin' && role !== 'admin' && role !== 'editor')) {
      return {
        statusCode: 403,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Forbidden' }),
      }
    }

    let rpcSuccess = false
    let rpcCount = 0

    // 2. Try decrypting via PostgreSQL RPC with RSVP_ENCRYPTION_KEY
    if (encKey && encKey.length >= 16) {
      try {
        const { data: count, error: rpcErr } = await supabaseAdmin.rpc(
          'decrypt_and_unmask_ticket_bookings',
          { p_enc_key: encKey },
        )
        if (!rpcErr) {
          rpcSuccess = true
          rpcCount = Number(count ?? 0)
          console.log('[ticket-unmask-contacts] RPC decrypted rows:', rpcCount)
        } else {
          console.warn('[ticket-unmask-contacts] RPC error:', rpcErr.message)
        }
      } catch (err) {
        console.warn('[ticket-unmask-contacts] RPC execution failed:', err)
      }
    }

    // 3. Fallback / supplementary check: Find rows where email is still null, empty, or masked
    const { data: pendingRows } = await supabaseAdmin
      .from('ticket_bookings')
      .select('id, reference_number, payment_reference, email, phone, email_masked, phone_masked')

    let stripeUpdated = 0
    if (pendingRows && pendingRows.length > 0) {
      const needsSync = pendingRows.filter(
        (r) => !r.email || r.email.includes('***') || !r.phone || r.phone.includes('***'),
      )

      if (needsSync.length > 0) {
        try {
          const host = event.headers.host ?? event.headers.Host ?? null
          const sCtx = await resolveStripe({ host })

          for (const row of needsSync) {
            let emailFound = row.email && !row.email.includes('***') ? row.email : null
            let phoneFound = row.phone && !row.phone.includes('***') ? row.phone : null

            if (row.payment_reference && (!emailFound || !phoneFound)) {
              try {
                if (row.payment_reference.startsWith('pi_')) {
                  const pi = await sCtx.stripe.paymentIntents.retrieve(row.payment_reference, {
                    expand: ['latest_charge'],
                  })
                  const charge = (pi.latest_charge as any) ?? null
                  emailFound =
                    emailFound ||
                    pi.receipt_email ||
                    charge?.billing_details?.email ||
                    pi.metadata?.email ||
                    null
                  phoneFound =
                    phoneFound ||
                    charge?.billing_details?.phone ||
                    pi.metadata?.phone ||
                    null
                } else if (row.payment_reference.startsWith('cs_')) {
                  const cs = await sCtx.stripe.checkout.sessions.retrieve(row.payment_reference)
                  emailFound =
                    emailFound ||
                    cs.customer_details?.email ||
                    cs.customer_email ||
                    cs.metadata?.email ||
                    null
                  phoneFound =
                    phoneFound ||
                    cs.customer_details?.phone ||
                    cs.metadata?.phone ||
                    null
                }
              } catch (stripeErr) {
                console.warn(
                  '[ticket-unmask-contacts] Could not fetch payment ref:',
                  row.payment_reference,
                  (stripeErr as Error).message,
                )
              }
            }

            if (emailFound || phoneFound) {
              await supabaseAdmin
                .from('ticket_bookings')
                .update({
                  ...(emailFound ? { email: emailFound } : {}),
                  ...(phoneFound ? { phone: phoneFound } : {}),
                })
                .eq('id', row.id)

              if (emailFound) {
                await supabaseAdmin
                  .from('receipts')
                  .update({ recipient_email: emailFound })
                  .eq('type', 'event')
                  .eq('related_id', row.id)
              }

              stripeUpdated++
            }
          }
        } catch (err) {
          console.warn('[ticket-unmask-contacts] Stripe reconciliation error:', err)
        }
      }
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        rpcDecrypted: rpcCount,
        stripeReconciled: stripeUpdated,
        message: `Contacts successfully unmasked (${rpcCount + stripeUpdated} records updated).`,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ticket-unmask-contacts] Error:', message)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message || 'Failed to unmask contacts' }),
    }
  }
}
