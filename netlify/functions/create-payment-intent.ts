/**
 * netlify/functions/create-payment-intent.ts
 *
 * Used by the ticket booking flow with embedded Payment Element:
 *   1. Client posts { eventId, amountEur, numAdults, numChildren, email }
 *   2. Server verifies the event is paid + published, recomputes amount from
 *      the events.ticket_price_eur to prevent client-side tampering.
 *   3. Creates a Stripe PaymentIntent with that amount; metadata holds the
 *      eventId + buyer email (no PII beyond email).
 *   4. Returns { clientSecret, paymentIntentId, amountEur }.
 *   5. Client confirms payment with PaymentElement, then posts the
 *      paymentIntentId to /ticket-submit which inserts the booking row.
 */

import type { Handler } from '@netlify/functions'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'
import { z } from 'zod'

const Schema = z.object({
  eventId:     z.string().uuid(),
  numAdults:   z.number().int().min(1).max(50),
  numChildren: z.number().int().min(0).max(50).optional().default(0),
  email:       z.string().email().max(254),
})

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let parsed
  try {
    parsed = Schema.safeParse(JSON.parse(event.body ?? '{}'))
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
    const host = event.headers.host ?? event.headers.Host ?? null
    const ctx  = await resolveStripe({ host })
    const supabase = supabaseAdmin()

    // Look up the canonical price so the client cannot tamper with amount.
    const { data: evtRow, error: evtErr } = await supabase
      .from('events')
      .select('id, title, slug, is_paid, published, ticket_price_eur')
      .eq('id', parsed.data.eventId)
      .single()

    if (evtErr || !evtRow) {
      return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Event not found' }) }
    }
    const evt = evtRow as {
      id: string; title: string; slug: string;
      is_paid: boolean; published: boolean; ticket_price_eur: number
    }
    if (!evt.is_paid)    return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Event is not a paid event' }) }
    if (!evt.published)  return { statusCode: 404, headers: jsonHeaders, body: JSON.stringify({ error: 'Event not found' }) }

    const adultPrice  = Number(evt.ticket_price_eur)
    const totalEur    = adultPrice * parsed.data.numAdults  // children free (matches client UI)
    if (!Number.isFinite(totalEur) || totalEur <= 0) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid ticket amount' }) }
    }

    const intent = await ctx.stripe.paymentIntents.create({
      amount:    Math.round(totalEur * 100),
      currency:  'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: parsed.data.email,
      description:   `Tickets: ${evt.title}`,
      metadata: {
        kind:        'ticket',
        eventId:     evt.id,
        eventSlug:   evt.slug,
        email:       parsed.data.email,
        numAdults:   String(parsed.data.numAdults),
        numChildren: String(parsed.data.numChildren ?? 0),
      },
    })

    console.log('[create-payment-intent] event', evt.id, '→ intent', intent.id, 'amount', totalEur, 'mode:', ctx.mode)

    return {
      statusCode: 200,
      headers:    jsonHeaders,
      body: JSON.stringify({
        clientSecret:    intent.client_secret,
        paymentIntentId: intent.id,
        amountEur:       totalEur,
        publishableKey:  ctx.publishableKey,
        mode:            ctx.mode,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[create-payment-intent] Error:', message)
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: message }) }
  }
}
