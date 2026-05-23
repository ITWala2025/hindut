/**
 * netlify/functions/stripe-webhook.ts
 *
 * Receives signed events from Stripe and reconciles our database:
 *
 *   • checkout.session.completed
 *       - kind = 'donation'    →   donations.status = 'succeeded'
 *                                 stripe_payment_intent_id = <pi>
 *       - kind = 'membership'  →   memberships.status = 'active'
 *                                 stripe_customer_id, stripe_subscription_id,
 *                                 started_at, expires_at = now + plan duration
 *
 *   • checkout.session.expired        →  donations.status = 'failed'
 *                                       memberships.status = 'canceled'
 *   • payment_intent.payment_failed  →  donations.status = 'failed'
 *   • charge.refunded                →  donations.status = 'refunded'
 *                                       ticket_bookings.status = 'refunded'
 *   • customer.subscription.updated  →  memberships.status mirrors subscription status
 *   • customer.subscription.deleted  →  memberships.status = 'canceled'
 *
 * Endpoint path:  /.netlify/functions/stripe-webhook
 *
 * In the Stripe dashboard create TWO webhook endpoints pointing here — one in
 * test mode and one in live mode — and copy their respective signing secrets
 * into STRIPE_WEBHOOK_SECRET_TEST / STRIPE_WEBHOOK_SECRET_LIVE.
 */

import type { Handler } from '@netlify/functions'
import Stripe from 'stripe'
import nodemailer from 'nodemailer'
import { supabaseAdmin, jsonHeaders } from './lib/stripe.js'
import {
  buildMembershipWelcomeEmailHtml,
  buildMembershipWelcomeEmailText,
  type MembershipWelcomeEmailParams,
} from './lib/membershipEmailTemplate.js'

// ---------------------------------------------------------------------------
// SMTP helpers (same credentials as rsvp-submit)
// ---------------------------------------------------------------------------
function createMailTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * Generate next HAI-YYYY-MM-XXXX code for the given Supabase client.
 * Uses optimistic insert: if a race produces a duplicate, the unique
 * constraint on member_code ensures at most one code per member.
 */
async function generateMemberCode(
  supabase: ReturnType<typeof supabaseAdmin>,
): Promise<string> {
  const now  = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `HAI-${yyyy}-${mm}-`

  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .like('member_code', `${prefix}%`)

  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

function getStripeForSecret(secretKey: string | undefined): Stripe | null {
  if (!secretKey) return null
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion })
}

function rawBody(event: Parameters<Handler>[0]): string {
  if (event.body == null) return ''
  if (event.isBase64Encoded) return Buffer.from(event.body, 'base64').toString('utf8')
  return event.body
}

/**
 * Try verifying the signature against each configured webhook secret.
 * Returns the Stripe instance + parsed event for whichever mode matched.
 */
function verifySignature(
  payload: string,
  signature: string,
): { stripe: Stripe; event: Stripe.Event; mode: 'test' | 'live' } | null {
  const candidates: Array<{ mode: 'test' | 'live'; secretKey?: string; webhookSecret?: string }> = [
    {
      mode:          'test',
      secretKey:     process.env.STRIPE_SECRET_KEY_TEST,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_TEST,
    },
    {
      mode:          'live',
      secretKey:     process.env.STRIPE_SECRET_KEY_LIVE,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    },
  ]
  for (const c of candidates) {
    const stripe = getStripeForSecret(c.secretKey)
    if (!stripe || !c.webhookSecret) continue
    try {
      const evt = stripe.webhooks.constructEvent(payload, signature, c.webhookSecret)
      return { stripe, event: evt, mode: c.mode }
    } catch {
      /* try next */
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const signature = event.headers['stripe-signature'] ?? event.headers['Stripe-Signature']
  if (!signature) {
    console.warn('[stripe-webhook] missing stripe-signature header')
    return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Missing signature' }) }
  }

  const payload = rawBody(event)
  const verified = verifySignature(payload, Array.isArray(signature) ? signature[0] : signature)
  if (!verified) {
    console.error('[stripe-webhook] signature verification failed (tried test + live secrets)')
    return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid signature' }) }
  }

  const { stripe, event: stripeEvent, mode } = verified
  console.log('[stripe-webhook]', mode, stripeEvent.type, stripeEvent.id)

  const supabase = supabaseAdmin()

  try {
    switch (stripeEvent.type) {
      // ─── Checkout completion ────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        const kind    = session.metadata?.kind

        if (kind === 'donation') {
          const donationId = session.metadata?.donationId

          if (donationId) {
            // ── One-time donation: update the pre-created pending row ────
            const paymentIntentId =
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id ?? null
            await supabase
              .from('donations')
              .update({
                status:                   'succeeded',
                stripe_payment_intent_id: paymentIntentId,
                updated_at:               new Date().toISOString(),
              })
              .eq('id', donationId)
            console.log('[stripe-webhook] one-time donation', donationId, '→ succeeded')
          } else {
            // ── Recurring donation: create the first row immediately ─────
            // Subsequent monthly charges are handled by invoice.paid.
            const subscriptionId =
              typeof session.subscription === 'string'
                ? session.subscription
                : (session.subscription as Stripe.Subscription | null)?.id ?? null
            const amountEur  = (session.amount_total ?? 0) / 100
            const donorName  = session.metadata?.donorName  ?? ''
            const donorEmail = session.metadata?.donorEmail ?? ''

            const { data: newDon, error: donErr } = await supabase
              .from('donations')
              .insert({
                donor_name:             donorName,
                donor_email:            donorEmail,
                gateway:                'stripe',
                amount_eur:             amountEur,
                currency:               'EUR',
                recurring:              true,
                status:                 'succeeded',
                description:            'Recurring donation',
                stripe_subscription_id: subscriptionId,
              })
              .select('id')
              .single()

            if (donErr) {
              console.error('[stripe-webhook] recurring donation insert error:', donErr.message)
            } else {
              console.log('[stripe-webhook] recurring donation', (newDon as { id: string })?.id,
                'created for', donorEmail, 'stripe sub', subscriptionId)
            }
          }
        } else if (kind === 'membership') {
          const membershipId  = session.metadata?.membershipId
          if (!membershipId) break

          const memberId      = session.metadata?.memberId   ?? null
          const memberName    = session.metadata?.fullName   ?? 'Member'
          const memberEmail   = session.metadata?.email      ?? null
          const planId        = session.metadata?.planId     ?? 'annual'

          // Resolve the human-readable plan name from membership_plans.
          let planName = 'Membership'
          {
            const { data: planRow } = await supabase
              .from('membership_plans')
              .select('name')
              .eq('id', planId)
              .maybeSingle()
            planName = (planRow as { name?: string } | null)?.name ?? planId
          }

          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id ?? null
          const customerId =
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id ?? null

          // Compute expiry: read subscription.current_period_end if available.
          let expiresAt: string | null = null
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId)
              expiresAt = new Date(sub.current_period_end * 1000).toISOString()
            } catch (err) {
              console.warn('[stripe-webhook] subscriptions.retrieve failed:', (err as Error).message)
            }
          }

          await supabase
            .from('memberships')
            .update({
              status:                  'active',
              stripe_customer_id:      customerId,
              stripe_subscription_id:  subscriptionId,
              started_at:              new Date().toISOString(),
              expires_at:              expiresAt,
              updated_at:              new Date().toISOString(),
            })
            .eq('id', membershipId)
          console.log('[stripe-webhook] membership', membershipId, '→ active')

          // ── Assign Member ID (one per email — never regenerated) ──────────
          let memberCode: string | null = null
          if (memberId) {
            // Fetch current member_code (may already exist for returning members)
            const { data: memberRow } = await supabase
              .from('members')
              .select('member_code')
              .eq('id', memberId)
              .maybeSingle()

            memberCode = (memberRow as { member_code?: string | null } | null)?.member_code ?? null

            if (!memberCode) {
              // Generate a new code and assign it atomically (only if still null)
              const newCode = await generateMemberCode(supabase)
              const { data: updated } = await supabase
                .from('members')
                .update({ member_code: newCode })
                .eq('id', memberId)
                .is('member_code', null)   // guard against race condition
                .select('member_code')
                .maybeSingle()
              memberCode = (updated as { member_code?: string | null } | null)?.member_code ?? newCode
              console.log('[stripe-webhook] assigned member_code', memberCode, 'to member', memberId)
            } else {
              console.log('[stripe-webhook] member', memberId, 'already has member_code', memberCode)
            }
          }

          // ── Send welcome email ────────────────────────────────────────────
          if (memberEmail && memberCode && process.env.SMTP_HOST) {
            try {
              const emailParams: MembershipWelcomeEmailParams = {
                memberName,
                memberCode,
                memberEmail,
                planName,
                addedMonthly: false, // standalone monthly giving is a separate flow
              }
              const transporter = createMailTransporter()
              await transporter.sendMail({
                from:    process.env.EMAIL_FROM ?? `"Hindu Association of Ireland" <${process.env.SMTP_USER}>`,
                to:      memberEmail,
                subject: 'Welcome to the Hindu Association of Ireland Community!',
                html:    buildMembershipWelcomeEmailHtml(emailParams),
                text:    buildMembershipWelcomeEmailText(emailParams),
              })
              console.log('[stripe-webhook] welcome email sent to', memberEmail, 'code:', memberCode)
            } catch (emailErr) {
              // Non-fatal: membership is already active. Log and continue.
              console.error('[stripe-webhook] welcome email error:', (emailErr as Error).message)
            }
          } else if (!process.env.SMTP_HOST) {
            console.log('[dev] SMTP_HOST not set — skipping welcome email for', memberEmail)
          }

          // ── Set up optional monthly contribution subscription ─────────────
          const monthlyContributionEur = parseFloat(session.metadata?.monthlyContributionEur ?? '0')
          if (monthlyContributionEur >= 1 && customerId) {
            try {
              // trial_end = first second of the first day of next month (UTC)
              const now = new Date()
              const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
              const trialEnd = Math.floor(nextMonthStart.getTime() / 1000)

              // Create the Stripe subscription — NO donation row yet.
              // A fresh 'succeeded' donation row is created by invoice.paid each
              // time a real payment is charged (trial invoices are skipped).
              const monthlySub = await stripe.subscriptions.create({
                customer: customerId,
                items: [{
                  price_data: {
                    currency:    'eur',
                    unit_amount: Math.round(monthlyContributionEur * 100),
                    product_data: {
                      name:        'Monthly Contribution – Hindu Association of Ireland',
                      description: `Monthly contribution by ${memberName}`,
                    },
                    recurring: { interval: 'month' as const },
                  },
                }],
                trial_end: trialEnd,
                metadata: {
                  kind:         'monthly_contribution',
                  amountEur:    String(monthlyContributionEur),
                  memberId:     memberId ?? '',
                  memberEmail:  memberEmail ?? '',
                  memberName,
                  membershipId,
                  planName,
                },
              })

              await supabase
                .from('memberships')
                .update({
                  monthly_contribution_eur: monthlyContributionEur,
                  monthly_stripe_sub_id:   monthlySub.id,
                })
                .eq('id', membershipId)

              // Update the membership receipt metadata so the PDF can describe the monthly sub
              await supabase
                .from('receipts')
                .update({
                  metadata: {
                    monthly_contribution_eur: monthlyContributionEur,
                    monthly_start_date:       nextMonthStart.toISOString(),
                  },
                })
                .eq('type', 'membership')
                .eq('related_id', membershipId)

              console.log('[stripe-webhook] monthly contribution sub', monthlySub.id, 'created for', memberEmail,
                'trial until', nextMonthStart.toISOString())
            } catch (subErr) {
              // Non-fatal: log but do not fail the webhook
              console.error('[stripe-webhook] monthly contribution setup error:', (subErr as Error).message)
            }
          }
        } else if (kind === 'ticket') {
          // ── Ticket booking ──────────────────────────────────────────────
          const meta = session.metadata ?? {}
          const encKey = process.env.RSVP_ENCRYPTION_KEY
          if (!encKey || encKey.length < 16) {
            console.error('[stripe-webhook] RSVP_ENCRYPTION_KEY missing — cannot persist ticket booking')
            break
          }

          const firstName   = meta.firstName   ?? ''
          const lastName    = meta.lastName    ?? ''
          const phone       = meta.phone       ?? ''
          const email       = meta.email       ?? ''
          const eventId     = meta.eventId     ?? ''
          const reference   = meta.reference   ?? ''
          const numAdults   = parseInt(meta.numAdults   ?? '1', 10)
          const numChildren = parseInt(meta.numChildren ?? '0', 10)
          const amountEur   = parseFloat(meta.amountEur ?? '0')

          if (!eventId || !reference || !firstName || !email) {
            console.error('[stripe-webhook] ticket metadata incomplete', meta)
            break
          }

          // Mask for admin display
          const emailMasked = email.includes('@')
            ? (() => {
                const [local, domain] = email.split('@')
                const masked = local.length <= 2 ? local[0] + '***' : local[0] + '***' + local[local.length - 1]
                return `${masked}@${domain}`
              })()
            : '***@***'
          const phoneMasked = phone.length < 5 ? '***' : phone.slice(0, 3) + ' *** *** ' + phone.slice(-4)

          // Get payment reference (PaymentIntent ID)
          const paymentRef =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null

          // Insert booking via encrypted RPC (status = 'confirmed' hardcoded in fn)
          const { data: bookingId, error: insertErr } = await supabase.rpc(
            'insert_ticket_booking_encrypted',
            {
              p_event_id:        eventId,
              p_reference:       reference,
              p_first_name:      firstName,
              p_last_name:       lastName,
              p_phone:           phone,
              p_email:           email,
              p_phone_masked:    phoneMasked,
              p_email_masked:    emailMasked,
              p_num_adults:      numAdults,
              p_num_children:    numChildren,
              p_amount_eur:      amountEur,
              p_payment_gateway: 'stripe',
              p_consent_gdpr:    true,
              p_enc_key:         encKey,
            },
          )

          if (insertErr) {
            console.error('[stripe-webhook] ticket booking insert error:', JSON.stringify(insertErr))
            break
          }

          // Set payment reference on the newly created row.
          if (paymentRef) {
            await supabase
              .from('ticket_bookings')
              .update({ payment_reference: paymentRef })
              .eq('id', bookingId)
          }

          console.log('[stripe-webhook] ticket booking created:', reference, 'id:', bookingId, 'pi:', paymentRef)
        }
        break
      }

      // ─── Checkout abandoned / expired ──────────────────────────────────
      case 'checkout.session.expired': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        const kind    = session.metadata?.kind

        if (kind === 'donation') {
          const donationId = session.metadata?.donationId
          if (donationId) {
            await supabase
              .from('donations')
              .update({ status: 'failed', updated_at: new Date().toISOString() })
              .eq('id', donationId)
              .eq('status', 'pending') // only update if still pending
            console.log('[stripe-webhook] donation', donationId, '→ failed (session expired)')
          }
        } else if (kind === 'membership') {
          const membershipId = session.metadata?.membershipId
          if (membershipId) {
            await supabase
              .from('memberships')
              .update({ status: 'canceled', updated_at: new Date().toISOString() })
              .eq('id', membershipId)
              .eq('status', 'pending') // only update if still pending
            console.log('[stripe-webhook] membership', membershipId, '→ canceled (session expired)')
          }
        }
        break
      }

      // ─── Payment failed ─────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = stripeEvent.data.object as Stripe.PaymentIntent
        const donationId = pi.metadata?.donationId
        if (donationId) {
          await supabase
            .from('donations')
            .update({ status: 'failed', stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
            .eq('id', donationId)
        }
        break
      }

      // ─── Charge refunded (works for one-off donations + tickets) ─────────
      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge
        const piId   = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id
        if (!piId) break
        await supabase
          .from('donations')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', piId)
        await supabase
          .from('ticket_bookings')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('payment_reference', piId)
        break
      }

      // ─── Monthly invoice paid → create a succeeded donation row ─────────
      case 'invoice.paid': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        // Skip zero-amount trial invoices (no money was charged)
        if ((invoice.amount_paid ?? 0) === 0) break

        const subId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription as Stripe.Subscription | null)?.id
        if (!subId) break

        // Handle subscriptions created by this app
        const sub = await stripe.subscriptions.retrieve(subId).catch(() => null)
        if (!sub) break

        const subKind = sub.metadata?.kind

        if (subKind === 'monthly_contribution') {
          // ── Monthly membership contribution ──────────────────────────
          // First invoice (subscription_create) is already recorded by
          // checkout.session.completed; only subsequent cycles need a new row.
          // However, monthly contributions don't pre-create a row, so we create
          // for every real invoice.
          const amountEur   = (invoice.amount_paid ?? 0) / 100
          const memberName  = sub.metadata?.memberName  ?? ''
          const memberEmail = sub.metadata?.memberEmail ?? ''
          const memberId    = sub.metadata?.memberId    || null
          const planName    = sub.metadata?.planName    ?? ''

          const { data: newDon, error: donErr } = await supabase
            .from('donations')
            .insert({
              donor_name:              memberName,
              donor_email:             memberEmail,
              member_id:               memberId,
              gateway:                 'stripe',
              amount_eur:              amountEur,
              currency:                invoice.currency?.toUpperCase() ?? 'EUR',
              recurring:               true,
              status:                  'succeeded',
              description:             `Monthly contribution — ${planName} member`,
              stripe_subscription_id:  subId,
            })
            .select('id')
            .single()

          if (donErr) {
            console.error('[stripe-webhook] failed to insert monthly donation row:', donErr.message)
          } else {
            console.log('[stripe-webhook] monthly contribution donation', (newDon as { id: string })?.id,
              'created for', memberEmail, 'amount', amountEur)
          }

        } else if (subKind === 'donation') {
          // ── Recurring donation: only handle subsequent monthly charges ──
          // The first charge row is created by checkout.session.completed.
          // Subsequent cycle invoices (billing_reason='subscription_cycle') need a new row.
          if ((invoice as Stripe.Invoice & { billing_reason?: string }).billing_reason !== 'subscription_cycle') break

          const amountEur  = (invoice.amount_paid ?? 0) / 100
          const donorName  = sub.metadata?.donorName  ?? ''
          const donorEmail = sub.metadata?.donorEmail ?? ''

          const { data: newDon, error: donErr } = await supabase
            .from('donations')
            .insert({
              donor_name:             donorName,
              donor_email:            donorEmail,
              gateway:                'stripe',
              amount_eur:             amountEur,
              currency:               invoice.currency?.toUpperCase() ?? 'EUR',
              recurring:              true,
              status:                 'succeeded',
              description:            'Recurring donation',
              stripe_subscription_id: subId,
            })
            .select('id')
            .single()

          if (donErr) {
            console.error('[stripe-webhook] failed to insert recurring donation row:', donErr.message)
          } else {
            console.log('[stripe-webhook] recurring donation', (newDon as { id: string })?.id,
              'created for', donorEmail, 'amount', amountEur)
          }
        }
        break
      }

      // ─── Subscription status mirror ─────────────────────────────────────
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        const membershipId = sub.metadata?.membershipId
        if (!membershipId) break

        const mappedStatus: Record<string, string> = {
          active:             'active',
          trialing:           'active',
          past_due:           'past_due',
          unpaid:             'past_due',
          incomplete:         'pending',
          incomplete_expired: 'expired',
          canceled:           'canceled',
          paused:             'pending',
        }
        const status = stripeEvent.type === 'customer.subscription.deleted'
          ? 'canceled'
          : (mappedStatus[sub.status] ?? 'pending')

        const expiresAt =
          stripeEvent.type === 'customer.subscription.deleted'
            ? null
            : new Date(sub.current_period_end * 1000).toISOString()

        await supabase
          .from('memberships')
          .update({
            status,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', membershipId)
        break
      }

      default:
        // Acknowledge but do nothing — keeps Stripe from retrying.
        break
    }

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ received: true }) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe-webhook] handler error:', message, 'event:', stripeEvent.type)
    // Return 500 so Stripe retries delivery.
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Handler error' }) }
  }
}
