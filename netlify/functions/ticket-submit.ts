/**
 * netlify/functions/ticket-submit.ts
 * Handles paid event ticket booking submissions:
 *   1. Server-side validation.
 *   2. Sanitisation.
 *   3. Calls Supabase RPC to insert with pgcrypto encryption.
 *   4. Returns booking reference to the client.
 *
 * Required Netlify environment variables (same as rsvp-submit):
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service-role secret key
 *   RSVP_ENCRYPTION_KEY       — 32-char+ random string (shared with RSVP flow)
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { sendMail, isMailConfigured } from './lib/mailer.js'
import { z } from 'zod'
import ws from 'ws'
import { resolveStripe } from './lib/stripe.js'
import {
  buildTicketEmailHtml,
  buildTicketEmailText,
  type TicketEmailParams,
} from './lib/ticketEmailTemplate.js'

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const TicketSchema = z.object({
  eventId:        z.string().uuid('Invalid event ID'),
  firstName:      z.string().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  lastName:       z.string().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  phone:          z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be E.164 format'),
  email:          z.string().email().max(254),
  numAdults:      z.number().int().min(1).max(50),
  numChildren:    z.number().int().min(0).max(50).optional().default(0),
  amountEur:      z.number().min(0),
  paymentGateway: z.literal('stripe'),
  paymentIntentId: z.string().min(1, 'paymentIntentId is required').optional(),
  consentGdpr:    z.literal(true),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sanitiseText(s: string): string {
  return s.trim().replace(/[<>"'&]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c] ?? c),
  )
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***@***'
  const masked =
    local.length <= 2 ? local[0] + '***' : local[0] + '***' + local[local.length - 1]
  return `${masked}@${domain}`
}

function maskPhone(phone: string): string {
  return phone.length < 5 ? '***' : phone.slice(0, 3) + ' *** *** ' + phone.slice(-4)
}

function generateReference(eventSlug?: string | null, eventId?: string): string {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf    = randomBytes(4)
  const suffix = Array.from(buf).map((b: number) => chars[b % chars.length]).join('')

  let code: string
  if (eventSlug) {
    code = eventSlug.replace(/-/g, '').toUpperCase().slice(0, 8)
  } else if (eventId) {
    code = eventId.replace(/-/g, '').toUpperCase().slice(0, 6)
  } else {
    code = 'EVT'
  }
  return `HAI-TKT-${code}-${suffix}`
}

/**
 * Create SMTP transporter for sending ticket emails
 */
// Graph API mailer used via sendMail() — no transporter needed

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // -- Environment checks
  const encKey      = process.env.RSVP_ENCRYPTION_KEY
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!encKey || encKey.length < 16) {
    console.error('[ticket-submit] RSVP_ENCRYPTION_KEY missing or too short')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) }
  }
  if (!supabaseUrl || !serviceKey) {
    console.error('[ticket-submit] Supabase env vars missing')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) }
  }

  try {
    const body   = JSON.parse(event.body ?? '{}')
    const parsed = TicketSchema.safeParse(body)

    if (!parsed.success) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error:   'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
      }
    }

    const data = parsed.data

    // -- Supabase admin client (bypasses RLS via service role)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws },
    })

    // -- Verify event exists, is paid, and is published
    const { data: evtRow, error: evtErr } = await supabase
      .from('events')
      .select('id, title, slug, is_paid, published, ticket_price_eur')
      .eq('id', data.eventId)
      .single()

    if (evtErr || !evtRow) {
      console.error('[ticket-submit] Event lookup error:', JSON.stringify(evtErr), 'eventId:', data.eventId)
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Event not found' }) }
    }
    if (!evtRow.is_paid) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ticket booking only available for paid events' }) }
    }
    if (!evtRow.published) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Event not found' }) }
    }

    // -- Verify Stripe PaymentIntent BEFORE saving the booking ---------------
    // The client must confirm the PaymentElement payment first; we then verify
    // here that the intent is succeeded and was created with the same eventId.
    if (!data.paymentIntentId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing paymentIntentId. Complete payment first.' }) }
    }
    let paymentReference: string
    try {
      const host  = event.headers.host ?? event.headers.Host ?? null
      const sCtx  = await resolveStripe({ host })
      const intent = await sCtx.stripe.paymentIntents.retrieve(data.paymentIntentId)
      if (intent.status !== 'succeeded') {
        console.warn('[ticket-submit] PaymentIntent not succeeded:', intent.id, intent.status)
        return { statusCode: 402, headers, body: JSON.stringify({ error: `Payment not completed (status: ${intent.status})` }) }
      }
      if (intent.metadata?.eventId && intent.metadata.eventId !== data.eventId) {
        console.error('[ticket-submit] PaymentIntent eventId mismatch:', intent.metadata.eventId, 'vs', data.eventId)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Payment does not match this event' }) }
      }
      const expectedCents = Math.round((Number(evtRow.ticket_price_eur) * data.numAdults) * 100)
      if (typeof intent.amount_received === 'number' && intent.amount_received < expectedCents) {
        console.error('[ticket-submit] Underpaid intent:', intent.amount_received, 'vs', expectedCents)
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Payment amount mismatch' }) }
      }
      paymentReference = intent.id
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[ticket-submit] PaymentIntent verification failed:', message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment verification failed' }) }
    }

    const firstName = sanitiseText(data.firstName)
    const lastName  = sanitiseText(data.lastName)
    const reference = generateReference(evtRow.slug, data.eventId)

    // -- Insert with pgcrypto encryption via RPC
    const { data: bookingId, error: insertErr } = await supabase.rpc(
      'insert_ticket_booking_encrypted',
      {
        p_event_id:        data.eventId,
        p_reference:       reference,
        p_first_name:      firstName,
        p_last_name:       lastName,
        p_phone:           data.phone,
        p_email:           data.email,
        p_phone_masked:    maskPhone(data.phone),
        p_email_masked:    maskEmail(data.email),
        p_num_adults:      data.numAdults,
        p_num_children:    data.numChildren ?? 0,
        p_amount_eur:      data.amountEur,
        p_payment_gateway: data.paymentGateway,
        p_consent_gdpr:    true,
        p_enc_key:         encKey,
      },
    )

    if (insertErr) {
      console.error('[ticket-submit] insert_ticket_booking_encrypted RPC error:', JSON.stringify(insertErr))
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save booking. Please try again.' }),
      }
    }

    // Persist the Stripe PaymentIntent ID on the booking row for reconciliation.
    await supabase
      .from('ticket_bookings')
      .update({ payment_reference: paymentReference })
      .eq('id', bookingId)

    console.log('[ticket-submit] Booking saved:', reference, 'id:', bookingId, 'pi:', paymentReference)

    // -- Send ticket confirmation email
    try {
      const { data: eventDetails } = await supabase
        .from('events')
        .select('title, date, time, location')
        .eq('id', data.eventId)
        .single()

      if (eventDetails && isMailConfigured()) {
        const transporter = createMailTransporter()
        
        // Format event date
        const eventDate = new Date(eventDetails.date)
        const eventDateStr = eventDate.toLocaleDateString('en-IE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })

        const emailParams: TicketEmailParams = {
          buyerName: firstName,
          buyerEmail: data.email,
          eventTitle: eventDetails.title,
          eventDate: eventDateStr,
          eventTime: eventDetails.time || '',
          eventLocation: eventDetails.location,
          ticketTier: evtRow.ticket_price_eur ? 'General Admission' : 'Free',
          quantity: data.numAdults + (data.numChildren || 0),
          totalPrice: data.amountEur,
          referenceNumber: reference,
        }

        await sendMail({
          from: process.env.EMAIL_FROM_EVENTS ?? process.env.EMAIL_FROM ?? '"HAI Events" <noreply@hindutemple.ie>',
          to: data.email,
          subject: `Ticket Confirmed – ${eventDetails.title}`,
          html: buildTicketEmailHtml(emailParams),
          text: buildTicketEmailText(emailParams),
          replyTo: 'info@hindutemple.ie',
        })

        console.log('[ticket-submit] ✅ Ticket email sent to', data.email)
      }
    } catch (emailErr) {
      const emailMessage = emailErr instanceof Error ? emailErr.message : String(emailErr)
      console.error('[ticket-submit] ⚠️ Failed to send ticket email:', emailMessage)
      // Don't fail the entire request if email fails - the booking was already saved
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success:         true,
        referenceNumber: reference,
        message:         'Ticket booking confirmed!',
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack   = err instanceof Error ? err.stack   : undefined
    console.error('[ticket-submit] Unhandled error:', message)
    if (stack) console.error('[ticket-submit] Stack:', stack)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
    }
  }
}
