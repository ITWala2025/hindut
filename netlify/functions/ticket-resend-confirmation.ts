/**
 * netlify/functions/ticket-resend-confirmation.ts
 *
 * Allows an authenticated admin/staff user to resend a ticket booking
 * confirmation email to the attendee (or to a specified corrected email address).
 *
 * Required Netlify environment variables:
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role secret key
 *   RSVP_ENCRYPTION_KEY       — Shared encryption key (optional fallback for legacy rows)
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import ws from 'ws'
import { sendMail, isMailConfigured } from './lib/mailer.js'
import {
  buildTicketEmailHtml,
  buildTicketEmailText,
  type TicketEmailParams,
} from './lib/ticketEmailTemplate.js'

const ResendSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  recipientEmail: z.string().email('Invalid email address').optional(),
})

export const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
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
    console.error('[ticket-resend-confirmation] Supabase env vars missing')
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Server configuration error' }),
    }
  }

  try {
    // 1. Verify caller's JWT and permissions
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

    if (!role) {
      return {
        statusCode: 403,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Forbidden' }),
      }
    }

    // super_admin & admin always allowed; editor requires tickets permissions
    if (role !== 'super_admin' && role !== 'admin') {
      if (role !== 'editor') {
        return {
          statusCode: 403,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'Forbidden' }),
        }
      }
      const { data: permRow } = await supabaseAdmin
        .from('role_permissions')
        .select('permissions')
        .eq('role', role)
        .maybeSingle()
      const perms = (permRow?.permissions ?? {}) as Record<string, Record<string, boolean>>
      if (!perms.tickets?.update && !perms.tickets?.view) {
        return {
          statusCode: 403,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'Permission denied: tickets permission required' }),
        }
      }
    }

    // 2. Parse request payload
    const body = JSON.parse(event.body ?? '{}')
    const parsed = ResendSchema.safeParse(body)
    if (!parsed.success) {
      return {
        statusCode: 422,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        }),
      }
    }

    const { bookingId, recipientEmail } = parsed.data

    // 3. Look up ticket booking
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bErr || !booking) {
      console.error('[ticket-resend-confirmation] Booking not found:', bookingId, bErr)
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Ticket booking not found' }),
      }
    }

    // 4. Resolve recipient email address
    let targetEmail = recipientEmail?.trim() || booking.email?.trim() || ''

    // If still missing, check receipts table for this booking
    if (!targetEmail) {
      const { data: rRow } = await supabaseAdmin
        .from('receipts')
        .select('recipient_email')
        .eq('type', 'event')
        .eq('related_id', bookingId)
        .maybeSingle()

      if (rRow?.recipient_email) {
        targetEmail = rRow.recipient_email.trim()
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'No valid recipient email found. Please specify a recipient email address.',
        }),
      }
    }

    // 5. Look up event details
    const { data: eventDetails, error: eErr } = await supabaseAdmin
      .from('events')
      .select('title, start_date, start_time, end_time, time_display, location, ticket_price_eur')
      .eq('id', booking.event_id)
      .single()

    if (eErr || !eventDetails) {
      console.error('[ticket-resend-confirmation] Event not found:', booking.event_id, eErr)
      return {
        statusCode: 404,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Associated event not found' }),
      }
    }

    // 6. Format event date in Ireland timezone
    const datePart = (eventDetails.start_date ?? '').slice(0, 10)
    const eventDateStr = datePart
      ? new Date(`${datePart}T12:00:00Z`).toLocaleDateString('en-IE', {
          timeZone: 'Europe/Dublin',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : ''

    const emailParams: TicketEmailParams = {
      buyerName: booking.first_name,
      buyerEmail: targetEmail,
      eventTitle: eventDetails.title,
      eventDate: eventDateStr,
      eventTime: eventDetails.time_display || '',
      eventLocation: eventDetails.location,
      ticketTier: eventDetails.ticket_price_eur ? 'General Admission' : 'Free',
      quantity:
        Number(booking.num_adults || 1) +
        Number(booking.num_children || 0) +
        Number(booking.num_children_0_4 || 0),
      totalPrice: Number(booking.amount_eur || 0),
      referenceNumber: booking.reference_number,
    }

    if (!isMailConfigured()) {
      console.warn('[ticket-resend-confirmation] Mail service not configured')
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Email service is not configured on the server' }),
      }
    }

    // 7. Dispatch confirmation email
    await sendMail({
      from: '"Hindu Association of Ireland" <community@hindutemple.ie>',
      to: targetEmail,
      subject: `Ticket Confirmed – ${eventDetails.title}`,
      html: buildTicketEmailHtml(emailParams),
      text: buildTicketEmailText(emailParams),
    })

    console.log(
      '[ticket-resend-confirmation] ✅ Confirmation email resent to',
      targetEmail,
      'booking:',
      booking.reference_number,
    )

    // 8. Update confirmation_sent_at and email on ticket_bookings
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('ticket_bookings')
      .update({
        confirmation_sent_at: now,
        ...(targetEmail ? { email: targetEmail } : {}),
      })
      .eq('id', booking.id)

    // 9. Update receipts email status if receipt exists
    await supabaseAdmin
      .from('receipts')
      .update({
        email_status: 'sent',
        sent_at: now,
      })
      .eq('type', 'event')
      .eq('related_id', booking.id)

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        message: `Ticket confirmation email resent to ${targetEmail}`,
        confirmationSentAt: now,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ticket-resend-confirmation] Error:', message)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message || 'Failed to resend confirmation email' }),
    }
  }
}
