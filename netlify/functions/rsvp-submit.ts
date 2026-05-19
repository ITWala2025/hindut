/**
 * netlify/functions/rsvp-submit.ts
 * Handles free-event RSVP submissions:
 *   1. Server-side validation (mirrors client Zod schema).
 *   2. Sanitisation to prevent XSS / SQL-injection.
 *   3. Calls Supabase RPC to insert with pgcrypto encryption.
 *   4. Sends HTML + plain-text confirmation email via SMTP (nodemailer).
 *
 * Required Netlify environment variables:
 *   SUPABASE_URL              — from Supabase dashboard → Settings → API
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard → Settings → API
 *   RSVP_ENCRYPTION_KEY       — 32-char+ random string (generated once, kept secret)
 *   SMTP_HOST                 — e.g. smtp.gmail.com / mail.privateemail.com
 *   SMTP_PORT                 — 587 (STARTTLS) or 465 (SSL)
 *   SMTP_SECURE               — "true" for port 465, "false" for 587
 *   SMTP_USER                 — your SMTP login username / email
 *   SMTP_PASS                 — your SMTP password / app password
 *   EMAIL_FROM                — display address, e.g. "HAI Events <events@hai.ie>"
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import nodemailer from 'nodemailer'
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

// ---------------------------------------------------------------------------
// SMTP transporter (created once per function warm instance)
// ---------------------------------------------------------------------------
function createTransporter() {
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
      .select('id, title, slug, start_date, location, is_paid, published, time_display')
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
    const startDate = new Date(evtRow.start_date)
    const endDate   = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // +2 hrs
    const locale    = 'en-IE'

    const formattedDate = startDate.toLocaleDateString(locale, {
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

    if (process.env.SMTP_HOST) {
      try {
        const transporter = createTransporter()
        await transporter.sendMail({
          from:    process.env.EMAIL_FROM ?? `"Hindu Association of Ireland" <${process.env.SMTP_USER}>`,
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
        console.error('SMTP send error:', emailErr)
      }
    } else {
      console.log('[dev] SMTP_HOST not set — skipping email for ref', reference)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success:         true,
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
