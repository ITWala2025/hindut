/**
 * rsvpEmailTemplate.ts
 * Self-contained HTML + plain-text email templates for RSVP confirmations.
 * Edit the brand colours, copy, and layout here — no code changes needed elsewhere.
 */

import { logoRow, footerInner } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RsvpEmailParams {
  firstName: string
  lastName: string
  eventTitle: string
  eventDate: string    // human-readable, e.g. "Saturday, 21 June 2025"
  eventTime: string    // e.g. "18:30" or empty string
  eventLocation: string
  referenceNumber: string
  numAdults: number
  numChildren: number
  googleCalUrl: string
  outlookCalUrl: string
}

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------
// Convert Date to Ireland timezone local time in ICS format (YYYYMMDDTHHMMSS)
function toICSDateLocal(d: Date): string {
  const dateStr = d.toLocaleDateString('en-IE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('/').reverse().join('')
  
  const timeStr = d.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/:/g, '')
  
  return dateStr + 'T' + timeStr
}

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function buildGoogleCalUrl(params: {
  title: string; start: Date; end: Date; location: string; details: string
}): string {
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(params.title)}` +
    `&dates=${toICSDate(params.start)}/${toICSDate(params.end)}` +
    `&details=${encodeURIComponent(params.details)}` +
    `&location=${encodeURIComponent(params.location)}`
  )
}

export function buildOutlookCalUrl(params: {
  title: string; start: Date; end: Date; location: string; body: string
}): string {
  return (
    'https://outlook.live.com/calendar/0/action/compose?rru=addevent' +
    `&subject=${encodeURIComponent(params.title)}` +
    `&startdt=${params.start.toISOString()}` +
    `&enddt=${params.end.toISOString()}` +
    `&body=${encodeURIComponent(params.body)}` +
    `&location=${encodeURIComponent(params.location)}`
  )
}

export function buildICS(params: {
  uid: string; title: string; start: Date; end: Date
  location: string; description: string
}): string {
  const startLocal = toICSDateLocal(params.start)
  const endLocal = toICSDateLocal(params.end)
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hindu Association of Ireland//RSVP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'X-LIC-LOCATION:Europe/Dublin',
    // VTIMEZONE component for Europe/Dublin
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Dublin',
    'BEGIN:STANDARD',
    'DTSTART:19701025T020000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZNAME:IST',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T010000',
    'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0100',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZNAME:GMT',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${params.uid}@hai.ie`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART;TZID=Europe/Dublin:${startLocal}`,
    `DTEND;TZID=Europe/Dublin:${endLocal}`,
    `SUMMARY:${params.title.replace(/\n/g, '\\n')}`,
    `LOCATION:${params.location.replace(/\n/g, '\\n')}`,
    `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// ---------------------------------------------------------------------------
// HTML template
// Edit colours and copy freely — keep the ${variable} placeholders.
// ---------------------------------------------------------------------------
export function buildEmailHtml(p: RsvpEmailParams): string {
  const attendees =
    `${p.numAdults} adult${p.numAdults !== 1 ? 's' : ''}` +
    (p.numChildren > 0 ? `, ${p.numChildren} child${p.numChildren !== 1 ? 'ren' : ''}` : '')

  const timeRow = p.eventTime
    ? `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;width:30%;">
          <span style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">Time</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
          <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">${p.eventTime}</span>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>RSVP Confirmation – ${p.eventTitle}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#fafaf8;font-family:Georgia,serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafaf8;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;overflow:hidden;">

        ${logoRow()}

        <!-- ═══════════════════════════════ HEADER ═══════════════════════════════ -->
        <tr>
          <td bgcolor="c2410c" style="background:#c2410c;padding:28px 40px 24px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#ffffff;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">
              Hindu Association of Ireland
            </p>
            <h1 style="margin:0 0 8px;font-size:26px;color:#ffffff;font-family:Georgia,serif;font-weight:normal;">
              RSVP Confirmed ✓
            </h1>
            <p style="margin:0;font-size:14px;color:#fecaca;font-family:Arial,sans-serif;">
              Thank you, ${p.firstName}. Your place is reserved.
            </p>
          </td>
        </tr>

        <!-- ═════════════════════════════ REFERENCE BANNER ═════════════════════════ -->
        <tr>
          <td bgcolor="fff7ed" style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:22px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;color:#9a3412;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">
              Reservation Reference
            </p>
            <p style="margin:0;font-size:26px;font-weight:bold;color:#7c2d12;font-family:'Courier New',Courier,monospace;letter-spacing:5px;">
              ${p.referenceNumber}
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#c2410c;font-family:Arial,sans-serif;">
              Quote this number at the event or if you need to get in touch.
            </p>
          </td>
        </tr>

        <!-- ═══════════════════════════ EVENT DETAILS ════════════════════════════ -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <h2 style="margin:0 0 20px;font-size:20px;color:#1c1917;font-family:Georgia,serif;font-weight:normal;border-bottom:2px solid #ffedd5;padding-bottom:12px;">
              ${p.eventTitle}
            </h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;width:30%;">
                  <span style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">Date</span>
                </td>
                <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                  <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">${p.eventDate}</span>
                </td>
              </tr>
              ${timeRow}
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                  <span style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">Venue</span>
                </td>
                <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                  <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">${p.eventLocation}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                  <span style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">Attendees</span>
                </td>
                <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                  <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">${attendees}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;vertical-align:top;">
                  <span style="font-size:12px;color:#78716c;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">Name</span>
                </td>
                <td style="padding:10px 0;vertical-align:top;">
                  <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">${p.firstName} ${p.lastName}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══════════════════════════ ADD TO CALENDAR ══════════════════════════ -->
        <tr>
          <td style="padding:0 40px 36px;">
            <p style="margin:0 0 12px;font-size:11px;color:#78716c;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">
              Add to your calendar
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:10px;">
                  <a href="${p.googleCalUrl}" target="_blank"
                     style="display:inline-block;padding:10px 20px;background:#4285F4;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;text-decoration:none;border-radius:8px;">
                    Google Calendar
                  </a>
                </td>
                <td>
                  <a href="${p.outlookCalUrl}" target="_blank"
                     style="display:inline-block;padding:10px 20px;background:#0078D4;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;font-weight:bold;text-decoration:none;border-radius:8px;">
                    Outlook
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0;font-size:11px;color:#a8a29e;font-family:Arial,sans-serif;">
              An iCal (.ics) file is also attached for Apple Calendar and other apps.
            </p>
          </td>
        </tr>

        <!-- ══════════════════════════════ FOOTER ════════════════════════════════ -->
        <tr>
          <td bgcolor="fafaf8" style="background:#fafaf8;border-top:1px solid #f5f5f4;padding:24px 40px;text-align:center;">
            ${footerInner({
              mainText: 'Hindu Association of Ireland · Ahane, Pallaskenry &amp; Mungret, Limerick',
              subText:  'This email was sent because you submitted an RSVP on our website. Your data is processed in accordance with GDPR and will not be shared with third parties.',
            })}
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Plain-text fallback
// ---------------------------------------------------------------------------
export function buildEmailText(p: RsvpEmailParams): string {
  const attendees =
    `${p.numAdults} adult${p.numAdults !== 1 ? 's' : ''}` +
    (p.numChildren > 0 ? `, ${p.numChildren} child${p.numChildren !== 1 ? 'ren' : ''}` : '')

  return `RSVP CONFIRMED – Hindu Association of Ireland
======================================================

Thank you, ${p.firstName} ${p.lastName}.
Your place at the event below has been reserved.

RESERVATION REFERENCE: ${p.referenceNumber}
Quote this number at the event or if you need to get in touch.

EVENT DETAILS
--------------
Event     : ${p.eventTitle}
Date      : ${p.eventDate}${p.eventTime ? `\nTime      : ${p.eventTime}` : ''}
Venue     : ${p.eventLocation}
Attendees : ${attendees}

ADD TO CALENDAR
---------------
Google Calendar : ${p.googleCalUrl}
Outlook         : ${p.outlookCalUrl}

An iCal (.ics) file is attached for Apple Calendar and other apps.

--
Hindu Association of Ireland · Ahane, Pallaskenry & Mungret, Limerick
Your data is processed in accordance with GDPR and will not be shared with third parties.
This email was sent because you submitted an RSVP on our website.
`
}
