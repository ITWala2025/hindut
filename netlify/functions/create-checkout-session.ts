/**
 * netlify/functions/create-checkout-session.ts
 *
 * Creates a Stripe Checkout Session for either:
 *   • a one-off donation         (kind = 'donation')
 *   • a recurring donation       (kind = 'donation' + recurring = true)
 *   • a membership subscription  (kind = 'membership')
 *   • a ticket booking           (kind = 'ticket')
 *
 * For donations: a 'donations' row is inserted with status='pending', then
 *   its UUID is attached to the Checkout Session metadata. The webhook
 *   finalises the row on payment_intent.succeeded.
 *
 * For memberships: a 'members' row is upserted (by email) and a 'memberships'
 *   row with status='pending' is created, then linked via session metadata.
 *
 * For tickets: a reference number is generated, all booking data is embedded
 *   in Checkout Session metadata. The webhook calls
 *   insert_ticket_booking_encrypted to persist the booking on payment success.
 *
 * Response: { url: string }  →  client redirects via window.location.href.
 */

import type { Handler } from '@netlify/functions'
import { randomBytes } from 'node:crypto'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const DonationSchema = z.object({
  kind:        z.literal('donation'),
  amountEur:   z.number().min(1).max(50000),
  donorName:   z.string().min(1).max(120),
  donorEmail:  z.string().email().max(254),
  recurring:   z.boolean().optional().default(false),
  description: z.string().max(500).optional(),
  successUrl:  z.string().url().optional(),
  cancelUrl:   z.string().url().optional(),
})

const MembershipSchema = z.object({
  kind:                   z.literal('membership'),
  planId:                 z.string().min(1).max(64),
  fullName:               z.string().min(1).max(120),
  email:                  z.string().email().max(254),
  phone:                  z.string().max(40).optional(),
  monthlyContributionEur: z.number().min(1).max(10000).optional(),
  successUrl:             z.string().url().optional(),
  cancelUrl:              z.string().url().optional(),
})

const TicketSchema = z.object({
  kind:        z.literal('ticket'),
  eventId:     z.string().uuid('Invalid event ID'),
  firstName:   z.string().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  lastName:    z.string().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  phone:       z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be E.164'),
  email:       z.string().email().max(254),
  numAdults:   z.number().int().min(1).max(20),
  numChildren: z.number().int().min(0).max(20).optional().default(0),
  consentGdpr: z.literal(true),
})

const BodySchema = z.discriminatedUnion('kind', [DonationSchema, MembershipSchema, TicketSchema])

// ---------------------------------------------------------------------------
// Ticket helpers
// ---------------------------------------------------------------------------
function generateTicketReference(eventId: string): string {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf    = randomBytes(4)
  const suffix = Array.from(buf).map((b: number) => chars[b % chars.length]).join('')
  const code   = eventId.replace(/-/g, '').toUpperCase().slice(0, 6)
  return `HAI-TKT-${code}-${suffix}`
}

function maskTicketEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***@***'
  const masked =
    local.length <= 2 ? local[0] + '***' : local[0] + '***' + local[local.length - 1]
  return `${masked}@${domain}`
}

function maskTicketPhone(phone: string): string {
  return phone.length < 5 ? '***' : phone.slice(0, 3) + ' *** *** ' + phone.slice(-4)
}

// Map a plan cadence (from membership_plans.cadence) to Stripe billing interval.
function cadenceToStripe(
  cadence: string | null | undefined,
  durationMonths: number,
): { interval: 'month' | 'year'; intervalCount: number } {
  switch (cadence) {
    case 'annual':       return { interval: 'year',  intervalCount: 1 }
    case 'semi_annual':  return { interval: 'month', intervalCount: 6 }
    case 'monthly':      return { interval: 'month', intervalCount: 1 }
    default: {
      // Fallback: derive from duration_months column.
      if (durationMonths >= 12) return { interval: 'year',  intervalCount: Math.max(1, Math.round(durationMonths / 12)) }
      return { interval: 'month', intervalCount: Math.max(1, durationMonths) }
    }
  }
}

function originFrom(event: Parameters<Handler>[0]): string {
  const origin = event.headers.origin ?? event.headers.Origin
  if (origin) return origin.replace(/\/$/, '')
  const host = event.headers.host ?? event.headers.Host
  const proto = (event.headers['x-forwarded-proto'] ?? event.headers['X-Forwarded-Proto']) as string | undefined
  if (host) return `${proto ?? 'https'}://${host}`.replace(/\/$/, '')
  return 'https://www.hindutemple.ie'
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let parsed
  try {
    parsed = BodySchema.safeParse(JSON.parse(event.body ?? '{}'))
  } catch {
    return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  if (!parsed.success) {
    return {
      statusCode: 422,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }),
    }
  }

  try {
    const host  = event.headers.host ?? event.headers.Host ?? null
    const ctx   = await resolveStripe({ host })
    const origin = originFrom(event)
    const supabase = supabaseAdmin()

    // ─────────────────────────────────────────────────────────────────────
    // DONATION
    // ─────────────────────────────────────────────────────────────────────
    if (parsed.data.kind === 'donation') {
      const d = parsed.data

      // One-time donations: pre-create a pending row so checkout.session.completed can update it.
      // Recurring donations: no pre-creation — invoice.paid creates a new row on each real charge.
      let donationId: string | null = null
      if (!d.recurring) {
        const { data: donationRow, error: insertErr } = await supabase
          .from('donations')
          .insert({
            donor_name:  d.donorName,
            donor_email: d.donorEmail,
            gateway:     'stripe',
            amount_eur:  d.amountEur,
            currency:    'EUR',
            recurring:   false,
            status:      'pending',
            description: d.description ?? 'One-time donation',
          })
          .select('id')
          .single()

        if (insertErr || !donationRow) {
          console.error('[create-checkout-session] donation insert error:', insertErr)
          return {
            statusCode: 500,
            headers:    jsonHeaders,
            body:       JSON.stringify({ error: 'Failed to create donation record' }),
          }
        }
        donationId = (donationRow as { id: string }).id
      }

      const lineItem: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem = {
        quantity: 1,
        price_data: {
          currency:    'eur',
          unit_amount: Math.round(d.amountEur * 100),
          product_data: {
            name:        d.recurring ? 'Recurring donation' : 'Donation to Hindu Association of Ireland',
            description: d.description ?? 'Supporting the Limerick Hindu Temple project',
          },
          ...(d.recurring
            ? { recurring: { interval: 'month' as const } }
            : {}),
        },
      }

      const session = await ctx.stripe.checkout.sessions.create({
        mode:             d.recurring ? 'subscription' : 'payment',
        // Omitting payment_method_types lets the Stripe Dashboard control which
        // methods appear (card, Apple Pay, Google Pay, Revolut Pay, etc.).
        // Enable individual methods at: https://dashboard.stripe.com/settings/payment_methods
        line_items:       [lineItem],
        customer_email:   d.donorEmail,
        success_url:      `${d.successUrl ?? `${origin}/donation-success`}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:        d.cancelUrl  ?? `${origin}/donate?cancelled=1`,
        metadata: {
          kind:        'donation',
          ...(donationId ? { donationId } : {}),
          donorName:   d.donorName,
          donorEmail:  d.donorEmail,
          recurring:   String(d.recurring),
        },
        ...(d.recurring
          ? {
              subscription_data: {
                // Carry donor info so invoice.paid can create a donation row per charge
                metadata: {
                  kind:      'donation',
                  donorName: d.donorName,
                  donorEmail: d.donorEmail,
                  amountEur:  String(d.amountEur),
                },
              },
            }
          : {
              payment_intent_data: {
                metadata: { kind: 'donation', donationId: donationId ?? '', donorEmail: d.donorEmail },
              },
            }),
      })

      console.log('[create-checkout-session] donation', donationId ?? '(recurring-no-id)', '→ session', session.id, 'mode:', ctx.mode)

      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ url: session.url, sessionId: session.id, mode: ctx.mode }) }
    }

    // ─────────────────────────────────────────────────────────────────────
    // TICKET
    // ─────────────────────────────────────────────────────────────────────
    if (parsed.data.kind === 'ticket') {
      const t = parsed.data

      // Verify event is valid, paid, and published.
      const { data: evtRow, error: evtErr } = await supabase
        .from('events')
        .select('id, title, ticket_price_eur, is_paid, published')
        .eq('id', t.eventId)
        .single()

      if (evtErr || !evtRow) {
        return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Event not found' }) }
      }
      const evt = evtRow as { id: string; title: string; ticket_price_eur: number; is_paid: boolean; published: boolean }
      if (!evt.is_paid) {
        return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Ticket booking only available for paid events' }) }
      }
      if (!evt.published) {
        return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Event not found' }) }
      }

      const adultPrice = Number(evt.ticket_price_eur) || 0
      const amountEur  = adultPrice * t.numAdults   // children are free
      const reference  = generateTicketReference(t.eventId)

      // Build a success URL that carries booking details so the success page
      // can render a confirmation without a separate API call.
      const successUrl =
        `${origin}/ticket-success` +
        `?ref=${encodeURIComponent(reference)}` +
        `&name=${encodeURIComponent(`${t.firstName} ${t.lastName}`)}` +
        `&event=${encodeURIComponent(evt.title)}` +
        `&adults=${t.numAdults}` +
        `&children=${t.numChildren ?? 0}` +
        `&amount=${amountEur}` +
        `&session_id={CHECKOUT_SESSION_ID}`

      const ticketSession = await ctx.stripe.checkout.sessions.create({
        mode:           'payment',
        customer_email: t.email,
        line_items: [{
          quantity: t.numAdults,
          price_data: {
            currency:     'eur',
            unit_amount:  Math.round(adultPrice * 100),
            product_data: {
              name:        `Ticket – ${evt.title}`,
              description: `Adult ticket · children free`,
            },
          },
        }],
        success_url: successUrl,
        cancel_url:  `${origin}/events?ticket_cancelled=1`,
        metadata: {
          kind:        'ticket',
          reference,
          eventId:     t.eventId,
          firstName:   t.firstName,
          lastName:    t.lastName,
          phone:       t.phone,
          email:       t.email,
          numAdults:   String(t.numAdults),
          numChildren: String(t.numChildren ?? 0),
          amountEur:   String(amountEur),
        },
        payment_intent_data: {
          metadata: {
            kind:      'ticket',
            reference,
            eventId:   t.eventId,
          },
        },
      })

      console.log('[create-checkout-session] ticket ref', reference, '→ session', ticketSession.id, 'mode:', ctx.mode)

      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ url: ticketSession.url, sessionId: ticketSession.id, mode: ctx.mode }) }
    }

    // ─────────────────────────────────────────────────────────────────────
    // MEMBERSHIP
    // ─────────────────────────────────────────────────────────────────────
    const m = parsed.data

    // Fetch plan row for price + duration metadata
    const { data: planRow, error: planErr } = await supabase
      .from('membership_plans')
      .select('id, name, price_eur, duration_months, cadence')
      .eq('id', m.planId)
      .maybeSingle()

    if (planErr || !planRow) {
      return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Membership plan not found' }) }
    }
    const plan = planRow as { id: string; name: string; price_eur: number; duration_months: number; cadence: string | null }

    // Upsert member by email (members table has unique constraint on email? let's just insert).
    let memberId: string | null = null
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('email', m.email)
      .maybeSingle()

    if (existingMember) {
      memberId = (existingMember as { id: string }).id
      await supabase
        .from('members')
        .update({ full_name: m.fullName, phone: m.phone ?? null })
        .eq('id', memberId)
    } else {
      const { data: newMember, error: memberErr } = await supabase
        .from('members')
        .insert({
          full_name: m.fullName,
          email:     m.email,
          phone:     m.phone ?? null,
          user_id:   null,
        })
        .select('id')
        .single()
      if (memberErr || !newMember) {
        console.error('[create-checkout-session] member insert error:', memberErr)
        return {
          statusCode: 500,
          headers:    jsonHeaders,
          body:       JSON.stringify({ error: 'Failed to create member record' }),
        }
      }
      memberId = (newMember as { id: string }).id
    }

    // Create pending membership row
    const { data: memRow, error: memErr } = await supabase
      .from('memberships')
      .insert({
        member_id: memberId,
        plan:      plan.id,
        status:    'pending',
      })
      .select('id')
      .single()

    if (memErr || !memRow) {
      console.error('[create-checkout-session] membership insert error:', memErr)
      return {
        statusCode: 500,
        headers:    jsonHeaders,
        body:       JSON.stringify({ error: 'Failed to create membership record' }),
      }
    }
    const membershipId = (memRow as { id: string }).id

    const cadence = cadenceToStripe(plan.cadence, plan.duration_months)
    const session = await ctx.stripe.checkout.sessions.create({
      mode:             'subscription',
      // Omitting payment_method_types lets the Stripe Dashboard control which
      // methods appear. Revolut Pay is not supported in subscription mode.
      customer_email:   m.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:    'eur',
          unit_amount: Math.round(plan.price_eur * 100),
          product_data: {
            name:        `${plan.name} membership`,
            description: `Hindu Association of Ireland — ${plan.name} plan`,
          },
          recurring: {
            interval:       cadence.interval,
            interval_count: cadence.intervalCount,
          },
        },
      }],
      success_url: `${m.successUrl ?? `${origin}/membership-success`}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  m.cancelUrl  ?? `${origin}/membership?cancelled=1`,
      metadata: {
        kind:         'membership',
        membershipId,
        memberId,
        planId:       m.planId,
        fullName:     m.fullName,
        email:        m.email,
        ...(m.monthlyContributionEur ? { monthlyContributionEur: String(m.monthlyContributionEur) } : {}),
      },
      subscription_data: {
        metadata: { kind: 'membership', membershipId, memberId, planId: m.planId },
      },
    })

    console.log('[create-checkout-session] membership', membershipId, '→ session', session.id, 'mode:', ctx.mode)

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ url: session.url, sessionId: session.id, mode: ctx.mode }) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[create-checkout-session] Error:', message)
    return {
      statusCode: 500,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: message }),
    }
  }
}
