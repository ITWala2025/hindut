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
 *   • payment_intent.payment_failed →  donations / memberships  status='failed' / 'past_due'
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
          if (!donationId) break
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null
          await supabase
            .from('donations')
            .update({
              status:                    'succeeded',
              stripe_payment_intent_id:  paymentIntentId,
              updated_at:                new Date().toISOString(),
            })
            .eq('id', donationId)
          console.log('[stripe-webhook] donation', donationId, '→ succeeded')
        } else if (kind === 'membership') {
          const membershipId  = session.metadata?.membershipId
          if (!membershipId) break

          const memberId      = session.metadata?.memberId   ?? null
          const memberName    = session.metadata?.fullName   ?? 'Member'
          const memberEmail   = session.metadata?.email      ?? null
          const planId        = session.metadata?.planId     ?? 'annual'

          // Map plan id to human-readable name
          const PLAN_NAMES: Record<string, string> = {
            'monthly':     'Monthly',
            'semi-annual': 'Semi-Annual',
            'annual':      'Annual',
          }
          const planName = PLAN_NAMES[planId] ?? 'Annual'

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
