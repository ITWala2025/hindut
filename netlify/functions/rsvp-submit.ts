/**
 * netlify/functions/rsvp-submit.ts
 * Handles free-event RSVP submissions:
 *   1. Server-side validation (mirrors client Zod schema).
 *   2. Sanitisation to prevent XSS / SQL-injection.
 *   3. Calls Supabase RPC to insert with pgcrypto encryption.
 *   4. Sends HTML + plain-text confirmation email via Microsoft Graph API.
 *
 * Required Netlify environment variables:
 *   SUPABASE_URL              — from Supabase dashboard → Settings → API
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard → Settings → API
 *   RSVP_ENCRYPTION_KEY       — 32-char+ random string (generated once, kept secret)
 *   AZURE_TENANT_ID           — Azure AD tenant ID
 *   AZURE_CLIENT_ID            — App registration client ID (Mail.Send permission)
 *   AZURE_CLIENT_SECRET        — App registration client secret
 *   MAIL_FROM_ADDRESS          — Sending mailbox (e.g. info@hindutemple.ie)
 *   EMAIL_FROM_PUJA            — Display FROM name, e.g. '"HAI Puja Seva" <info@hindutemple.ie>'
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { sendMail, isMailConfigured } from './lib/mailer.js'
import { z } from 'zod'
import ws from 'ws'
import {
  buildEmailHtml,
  buildEmailText,
  buildGoogleCalUrl,
  buildOutlookCalUrl,
  buildICS,
} from './lib/rsvpEmailTemplate'

// ---------------------------------------------------------------------------
// Validation schema — must match client-side schema in RsvpDialog.tsx
// ---------------------------------------------------------------------------
const RsvpSchema = z.object({
  eventId:     z.string().uuid('Invalid event ID'),
  firstName:   z.string().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  lastName:    z.string().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s\-']+$/),
  phone:       z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be E.164 format'),
  email:       z.string().email().max(254),
  numAdults:   z.number().int().min(1).max(50),
  numChildren: z.number().int().min(0).max(50).optional().default(0),
  consentGdpr: z.literal(true),
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

/**
 * Generates a human-readable booking reference: HAI-{EVENTCODE}-XXXX
 *   eventSlug  e.g. "diwali-2026"  → DIWALI202 (max 8 chars, no hyphens)
 *   fallback   first 6 chars of eventId if slug is absent
 *   suffix     4 random URL-safe chars for uniqueness
 */
function generateReference(eventSlug?: string | null, eventId?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf   = randomBytes(4)
  const suffix = Array.from(buf).map((b: number) => chars[b % chars.length]).join('')

  let code: string
  if (eventSlug) {
    // Strip hyphens, uppercase, cap at 8 chars  →  diwali-2026 → DIWALI20
    code = eventSlug.replace(/-/g, '').toUpperCase().slice(0, 8)
  } else if (eventId) {
    // Fallback: first 6 chars of the UUID (no hyphens)
    code = eventId.replace(/-/g, '').toUpperCase().slice(0, 6)
  } else {
    code = 'EVT'
  }

  return `HAI-${code}-${suffix}`
}

/**
 * Builds correct UTC start/end Dates from the DB start_date (date-only, midnight UTC)
 * and explicit start_time / end_time strings (e.g. "4:00 PM", "7:00 PM") in Europe/Dublin time.
 * Falls back to start_date + 2 h if times are absent or unparseable.
 */
function buildEventDates(
  startDateStr: string,
  startTimeStr: string | null,
  endTimeStr:   string | null,
): { startDate: Date; endDate: Date } {
  const datePart = startDateStr.slice(0, 10) // "YYYY-MM-DD"

  // Probe Dublin UTC offset for this date (noon avoids DST edge cases)
  const probe = new Date(`${datePart}T12:00:00Z`)
  const dublinNoon = parseInt(
    probe.toLocaleTimeString('en-IE', { timeZone: 'Europe/Dublin', hour: '2-digit', hour12: false }),
    10,
  )
  const offsetHours = dublinNoon - 12 // +1 in IST (summer), 0 in GMT (winter)

  function dublinToUTC(h: number, m: number): Date {
    const baseMs = new Date(`${datePart}T00:00:00Z`).getTime()
    return new Date(baseMs + (h - offsetHours) * 3_600_000 + m * 60_000)
  }

  function parseAMPM(t: string): { h: number; m: number } | null {
    const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i)
    if (!match) return null
    let h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12
    if (match[3].toUpperCase() === 'AM' && h === 12) h = 0
    return { h, m }
  }

  if (startTimeStr) {
    const start = parseAMPM(startTimeStr)
    if (start) {
      const startDate = dublinToUTC(start.h, start.m)
      if (endTimeStr) {
        const end = parseAMPM(endTimeStr)
        if (end) {
          return { startDate, endDate: dublinToUTC(end.h, end.m) }
        }
      }
      // start only — default 2-hour duration
      return { startDate, endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000) }
    }
  }

  const startDate = new Date(startDateStr)
  return { startDate, endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000) }
}

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
  const encKey       = process.env.RSVP_ENCRYPTION_KEY
  const supabaseUrl  = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!encKey || encKey.length < 16) {
    console.error('RSVP_ENCRYPTION_KEY missing or too short')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) }
  }
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase env vars missing')
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) }
  }

  try {
    const body   = JSON.parse(event.body ?? '{}')
    const parsed = RsvpSchema.safeParse(body)

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

    // -- Verify event exists, is free, and is published
    const { data: evtRow, error: evtErr } = await supabase
      .from('events')
      .select('id, title, slug, start_date, location, is_paid, published, time_display, start_time, end_time')
      .eq('id', data.eventId)
      .single()

    if (evtErr || !evtRow) {
      console.error('[rsvp-submit] Event lookup error:', JSON.stringify(evtErr), 'eventId:', data.eventId)
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Event not found' }) }
    }
    if (evtRow.is_paid) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'RSVP only available for free events' }) }
    }
    if (!evtRow.published) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Event not found' }) }
    }

    const firstName = sanitiseText(data.firstName)
    const lastName  = sanitiseText(data.lastName)
    const reference = generateReference(evtRow.slug, data.eventId)

    // -- Insert with pgcrypto encryption via Supabase RPC
    const { data: rsvpId, error: insertErr } = await supabase.rpc('insert_rsvp_encrypted', {
      p_event_id:     data.eventId,
      p_reference:    reference,
      p_first_name:   firstName,
      p_last_name:    lastName,
      p_phone:        data.phone,
      p_email:        data.email,
      p_phone_masked: maskPhone(data.phone),
      p_email_masked: maskEmail(data.email),
      p_num_adults:   data.numAdults,
      p_num_children: data.numChildren ?? 0,
      p_consent_gdpr: true,
      p_enc_key:      encKey,
    })

    if (insertErr) {
      console.error('[rsvp-submit] insert_rsvp_encrypted RPC error:', JSON.stringify(insertErr))
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save RSVP. Please try again.' }),
      }
    }

    // -- Build calendar URLs + ICS
    const { startDate, endDate } = buildEventDates(
      evtRow.start_date,
      evtRow.start_time ?? null,
      evtRow.end_time   ?? null,
    )
    const locale = 'en-IE'

    const formattedDate = startDate.toLocaleDateString(locale, {
      timeZone: 'Europe/Dublin',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const formattedTime: string = evtRow.time_display ?? ''

    const gcUrl = buildGoogleCalUrl({
      title:   evtRow.title,
      start:   startDate,
      end:     endDate,
      location: evtRow.location ?? '',
      details: `RSVP Reference: ${reference}`,
    })
    const olUrl = buildOutlookCalUrl({
      title:   evtRow.title,
      start:   startDate,
      end:     endDate,
      location: evtRow.location ?? '',
      body:    `RSVP Reference: ${reference}`,
    })
    const icsContent = buildICS({
      uid:         rsvpId as string,
      title:       evtRow.title,
      start:       startDate,
      end:         endDate,
      location:    evtRow.location ?? '',
      description: `RSVP Reference: ${reference}`,
    })

    // -- Send confirmation email via SMTP
    const emailParams = {
      firstName,
      lastName,
      eventTitle:    evtRow.title,
      eventDate:     formattedDate,
      eventTime:     formattedTime,
      eventLocation: evtRow.location ?? '',
      referenceNumber: reference,
      numAdults:     data.numAdults,
      numChildren:   data.numChildren ?? 0,
      googleCalUrl:  gcUrl,
      outlookCalUrl: olUrl,
    }

    if (isMailConfigured()) {
      try {
        await sendMail({
          from:    process.env.EMAIL_FROM_PUJA ?? process.env.EMAIL_FROM ?? '"HAI Puja Seva" <noreply@hindutemple.ie>',
          to:      data.email,
          subject: `Your RSVP Confirmation – ${evtRow.title} – Ref #${reference}`,
          html:    buildEmailHtml(emailParams),
          text:    buildEmailText(emailParams),
          attachments: [
            {
              filename:    'event.ics',
              content:     icsContent,
              contentType: 'text/calendar; method=REQUEST',
            },
          ],
        })

        // Mark confirmation as sent
        await supabase
          .from('event_rsvps')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', rsvpId as string)
      } catch (emailErr) {
        // Non-fatal: RSVP is already saved. Log and continue.
        console.error('Graph API send error:', emailErr)
      }
    } else {
      console.log('[dev] Mail not configured — skipping email for ref', reference)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success:         true,
        rsvpId:          rsvpId as string,
        referenceNumber: reference,
        message:         'RSVP confirmed! A confirmation email has been sent.',
      }),
    }
  } catch (err) {
    const message  = err instanceof Error ? err.message : String(err)
    const stack    = err instanceof Error ? err.stack   : undefined
    // Log full detail so it appears in Netlify function logs
    console.error('[rsvp-submit] ===== UNHANDLED ERROR =====')
    console.error('[rsvp-submit] message:', message)
    console.error('[rsvp-submit] stack:', stack ?? 'no stack')
    console.error('[rsvp-submit] err object:', JSON.stringify(err, Object.getOwnPropertyNames(err as object)))
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'An unexpected error occurred. Please try again.',
        _debug: message,
        _stack: stack?.split('\n').slice(0, 5).join(' | '),
      }),
    }
  }
}
