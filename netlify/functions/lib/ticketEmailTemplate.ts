/**
 * netlify/functions/lib/ticketEmailTemplate.ts
 *
 * HTML + plain-text email templates for paid event ticket confirmations.
 * Sent after successful ticket purchase via Stripe.
 */

import { logoRow, footerInner, getSiteUrl } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TicketEmailParams {
  buyerName: string
  buyerEmail: string
  eventTitle: string
  eventDate: string          // human-readable, e.g. "Saturday, 15 June 2024"
  eventTime: string          // e.g. "18:30" or empty string
  eventLocation: string
  ticketTier: string         // e.g. "General Admission"
  quantity: number
  totalPrice: number         // in EUR
  referenceNumber: string    // e.g. "TKT-1718304500000"
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
export function buildTicketEmailHtml(p: TicketEmailParams): string {
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ticket Confirmation – ${p.eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;">

          ${logoRow()}

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c,#d97706);padding:28px 40px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;
                         color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;">
                Event Ticket
              </p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;
                          font-family:Arial,sans-serif;line-height:1.3;">
                Ticket Confirmed ✓
              </h1>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);
                         font-family:Arial,sans-serif;">
                Thank you, ${p.buyerName}. Your ticket is ready!
              </p>
            </td>
          </tr>

          <!-- Reference Banner -->
          <tr>
            <td style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:22px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#9a3412;letter-spacing:2px;
                         text-transform:uppercase;font-family:Arial,sans-serif;">
                Ticket Reference
              </p>
              <p style="margin:0;font-size:26px;font-weight:bold;color:#7c2d12;
                         font-family:'Courier New',Courier,monospace;letter-spacing:5px;">
                ${p.referenceNumber}
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#c2410c;font-family:Arial,sans-serif;">
                Please bring this reference or present the email at the event.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:16px;color:#1c1917;font-family:Arial,sans-serif;">
                      Dear <strong>${p.buyerName}</strong>,
                    </p>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;
                               font-family:Arial,sans-serif;">
                      Thank you for your ticket purchase! Your order has been confirmed and
                      your ticket is ready. Please keep this email for your records.
                    </p>
                  </td>
                </tr>

                <!-- Event Details -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <h2 style="margin:0 0 16px;font-size:18px;color:#1c1917;font-family:Arial,sans-serif;
                                border-bottom:2px solid #ffedd5;padding-bottom:8px;">
                      ${p.eventTitle}
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;width:30%;">
                          <span style="font-size:12px;color:#78716c;text-transform:uppercase;
                                       letter-spacing:1px;font-family:Arial,sans-serif;">Date</span>
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                          <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">
                            ${p.eventDate}
                          </span>
                        </td>
                      </tr>
                      ${timeRow}
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                          <span style="font-size:12px;color:#78716c;text-transform:uppercase;
                                       letter-spacing:1px;font-family:Arial,sans-serif;">Venue</span>
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                          <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">
                            ${p.eventLocation}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                          <span style="font-size:12px;color:#78716c;text-transform:uppercase;
                                       letter-spacing:1px;font-family:Arial,sans-serif;">Tickets</span>
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                          <span style="font-size:15px;color:#1c1917;font-family:Arial,sans-serif;">
                            ${p.quantity}x ${p.ticketTier}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;vertical-align:top;">
                          <span style="font-size:12px;color:#78716c;text-transform:uppercase;
                                       letter-spacing:1px;font-family:Arial,sans-serif;">Total</span>
                        </td>
                        <td style="padding:10px 0;vertical-align:top;">
                          <span style="font-size:18px;font-weight:700;color:#ea580c;
                                       font-family:Arial,sans-serif;">
                            €${p.totalPrice.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Important info -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:13px;color:#15803d;font-family:Arial,sans-serif;
                                     line-height:1.6;">
                            <strong>📍 Arrive Early:</strong> Please arrive 15-20 minutes before the event
                            begins to allow time for check-in and seating.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Closing -->
                <tr>
                  <td style="padding:0 0 8px;border-top:1px solid #e7e5e4;padding-top:20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;
                               font-family:Arial,sans-serif;">
                      We look forward to seeing you at the event! If you have any questions,
                      please don't hesitate to reach out to us.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0 0;">
                    <p style="margin:0 0 4px;font-size:15px;color:#44403c;font-family:Arial,sans-serif;">
                      Warm regards,
                    </p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ea580c;
                               font-family:Arial,sans-serif;">
                      Team HAI
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">
                      Hindu Association of Ireland · info@hindutemple.ie
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafaf9;border-top:1px solid #e7e5e4;padding:24px 40px;text-align:center;">
              ${footerInner({
                mainText: `This ticket was sent to ${p.buyerEmail}. Please keep this email safe for check-in at the event.`,
                subText: 'For support or questions, contact info@hindutemple.ie',
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
// Plain-text template
// ---------------------------------------------------------------------------
export function buildTicketEmailText(p: TicketEmailParams): string {
  const timeRow = p.eventTime ? `\nTime:    ${p.eventTime}` : ''

  return `EVENT TICKET CONFIRMATION

Dear ${p.buyerName},

Thank you for your ticket purchase! Your order has been confirmed.

TICKET REFERENCE: ${p.referenceNumber}
Please bring this reference or present this email at the event.

EVENT DETAILS:
${p.eventTitle}
Date:    ${p.eventDate}${timeRow}
Venue:   ${p.eventLocation}

TICKET INFORMATION:
Quantity: ${p.quantity}x ${p.ticketTier}
Total:    €${p.totalPrice.toFixed(2)}

IMPORTANT:
Please arrive 15-20 minutes before the event begins to allow time for check-in.

We look forward to seeing you at the event!
If you have any questions, please contact us at info@hindutemple.ie

Warm regards,
Team HAI
Hindu Association of Ireland
`
}
