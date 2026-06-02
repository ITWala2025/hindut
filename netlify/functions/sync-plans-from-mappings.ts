/**
 * sync-plans-from-mappings.ts
 *
 * Admin endpoint to sync membership plans from Stripe products (via mappings table)
 * to the database. Fetches Stripe product details and stores with all attributes.
 *
 * POST /.netlify/functions/sync-plans-from-mappings
 * Authorization: Bearer <supabase-access-token>
 *
 * Response:
 *   {
 *     mode: 'test' | 'live',
 *     synced: number
 *   }
 */

import type { Handler } from '@netlify/functions'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; reason: string }

async function requireRole(
  authHeader: string | undefined,
  allowedRoles: string[],
): Promise<AuthResult> {
  if (!authHeader) return { ok: false, status: 401, reason: 'No Authorization header' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, reason: 'Empty bearer token' }

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) {
    return { ok: false, status: 401, reason: 'Invalid token' }
  }

  const userId = userData.user.id

  // Check role in public.user_roles table
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  const role = roleData?.role ?? userData.user.app_metadata?.role ?? 'viewer'

  if (role === 'super_admin' || allowedRoles.includes(role)) {
    return { ok: true, userId }
  }

  return { ok: false, status: 403, reason: 'Insufficient permissions' }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const auth = await requireRole(
    event.headers.authorization ?? event.headers.Authorization,
    ['super_admin', 'admin']
  )

  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: jsonHeaders,
      body: JSON.stringify({ error: auth.reason }),
    }
  }

  try {
    const host = event.headers.host ?? event.headers.Host ?? null
    const ctx = await resolveStripe({ host })
    const supabase = supabaseAdmin()

    // Fetch all membership mappings for current mode
    const { data: mappings, error: mappingsError } = await supabase
      .from('stripe_product_mappings')
      .select('*')
      .eq('entity_type', 'membership')
      .eq('stripe_mode', ctx.mode)
      .eq('is_active', true)

    if (mappingsError) {
      throw new Error(`Failed to fetch mappings: ${mappingsError.message}`)
    }

    if (!mappings || mappings.length === 0) {
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          mode: ctx.mode,
          synced: 0,
          message: 'No membership mappings found for current mode'
        }),
      }
    }

    let synced = 0

    // Sync each mapped product
    for (const mapping of mappings) {
      try {
        // Fetch full product details from Stripe
        const product = await ctx.stripe.products.retrieve(mapping.stripe_product_id)
        const price = await ctx.stripe.prices.retrieve(mapping.stripe_price_id)

        // Extract metadata and attributes
        const metadata = product.metadata || {}
        const priceAmount = typeof price.unit_amount === 'number' ? price.unit_amount / 100 : 0

        // Determine cadence from price interval
        let cadence = 'annual'
        if (price.type === 'recurring' && price.recurring) {
          cadence = price.recurring.interval === 'month' ? 'monthly' : 'annual'
        } else if (price.type === 'one_time') {
          cadence = 'one_time'
        }

        // Determine duration based on cadence
        let durationMonths = 12
        let durationLabel = '1 Year'
        if (cadence === 'monthly') {
          durationMonths = 1
          durationLabel = '1 Month'
        } else if (cadence === 'one_time') {
          durationMonths = 0
          durationLabel = 'One Time'
        }

        // Build benefits array
        let benefits: string[] = []
        if (metadata.benefits) {
          try {
            benefits = JSON.parse(metadata.benefits)
          } catch {
            benefits = metadata.benefits.split(',').map((b: string) => b.trim())
          }
        }

        // Upsert to membership_plans
        const { error: upsertError } = await supabase
          .from('membership_plans')
          .upsert({
            id: mapping.entity_id,
            name: product.name,
            duration_label: durationLabel,
            duration_months: durationMonths,
            price_eur: priceAmount,
            description: product.description || '',
            benefits: benefits,
            popular: metadata.popular === 'true' || metadata.popular === '1',
            sort_order: parseInt(metadata.sort_order || '0'),
            subtitle: metadata.subtitle || null,
            icon: metadata.icon || null,
            gradient: metadata.gradient || null,
            bg_gradient: metadata.bg_gradient || null,
            border_color: metadata.border_color || null,
            category: metadata.category || 'membership',
            cadence: cadence,
            active: product.active,
            stripe_product_id: mapping.stripe_product_id,
            stripe_price_id: mapping.stripe_price_id,
            stripe_mode: ctx.mode,
          }, {
            onConflict: 'id'
          })

        if (upsertError) {
          console.error('[sync-plans] Error upserting plan:', mapping.entity_id, upsertError)
        } else {
          synced++
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[sync-plans] Error processing mapping ${mapping.id}:`, message)
        // Continue with other mappings
      }
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        mode: ctx.mode,
        synced,
        total: mappings.length,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sync-plans] fatal error:', message)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message }),
    }
  }
}
