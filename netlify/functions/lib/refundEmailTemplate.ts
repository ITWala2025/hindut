/**
 * netlify/functions/lib/refundEmailTemplate.ts
 *
 * HTML + plain-text email templates for payment refunds.
 * Sent when a customer receives a refund for tickets, donations, or other purchases.
 */

import { logoRow, footerInner } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RefundEmailParams {
  customerName: string
  customerEmail: string
  itemType: 'ticket' | 'donation' | 'membership'
  itemDescription: string  // e.g. "Diwali Festival Tickets (2x General Admission)"
  originalAmount: number   // original charge in EUR
  refundAmount: number     // refund amount in EUR
  referenceNumber?: string
  reason?: string          // e.g. "Customer request"
  estimatedDays?: number   // e.g. 3-5 business days
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
export function buildRefundEmailHtml(p: RefundEmailParams): string {
  const estimatedText = p.estimatedDays
    ? `Refunds typically appear within ${p.estimatedDays} business days, depending on your bank.`
    : 'Refunds typically appear within 3-5 business days, depending on your bank.'

  const referenceRow = p.referenceNumber
    ? `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f5f5f4;">
          <span style="font-size:12px;color:#78716c;text-transform:uppercase;font-family:Arial,sans-serif;">Reference</span>
          &nbsp; <span style="font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
            ${p.referenceNumber}
          </span>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Refund Processed \u2013 Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;width:100%;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center" style="padding:0;">

        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background:#ffffff;width:600px;">

          ${logoRow()}

          <!-- Header - Green/Success theme (Outlook-safe solid color) -->
          <tr>
            <td bgcolor="059669" style="background:#059669;padding:28px 40px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;color:#ffffff;font-family:Arial,sans-serif;line-height:1.2;">
                Refund Confirmation
              </p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;line-height:1.3;">
                Refund Processed \u2713
              </h1>
              <p style="margin:0;font-size:13px;color:#d1fae5;font-family:Arial,sans-serif;">
                Your refund has been issued
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:16px;color:#1c1917;font-family:Arial,sans-serif;">
                      Hi <strong>${p.customerName}</strong>,
                    </p>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      We have processed your refund. ${estimatedText}
                      ${p.reason ? ` <strong>Reason:</strong> ${p.reason}` : ''}
                    </p>
                  </td>
                </tr>

                <!-- Refund details box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;">
                      <tr>
                        <td bgcolor="f0fdf4" style="background:#f0fdf4;padding:20px 24px;">
                          <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;color:#15803d;font-family:Arial,sans-serif;">
                            Refund Summary
                          </p>
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#047857;font-family:Arial,sans-serif;padding-bottom:8px;">
                                <strong>Item:</strong>
                              </td>
                              <td style="font-size:13px;color:#047857;font-family:Arial,sans-serif;padding-bottom:8px;text-align:right;">
                                ${p.itemDescription}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#047857;font-family:Arial,sans-serif;padding-bottom:8px;">
                                <strong>Original Amount:</strong>
                              </td>
                              <td style="font-size:13px;color:#047857;font-family:Arial,sans-serif;padding-bottom:8px;text-align:right;">
                                \u20ac${p.originalAmount.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:14px;font-weight:700;color:#15803d;font-family:Arial,sans-serif;padding-top:8px;border-top:1px solid #86efac;">
                                <strong>Refund Amount:</strong>
                              </td>
                              <td style="font-size:18px;font-weight:700;color:#15803d;font-family:Arial,sans-serif;padding-top:8px;border-top:1px solid #86efac;text-align:right;">
                                \u20ac${p.refundAmount.toFixed(2)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Processing info -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #93c5fd;">
                      <tr>
                        <td bgcolor="eff6ff" style="background:#eff6ff;padding:16px 20px;">
                          <p style="margin:0;font-size:13px;color:#1e40af;font-family:Arial,sans-serif;line-height:1.6;">
                            <strong>\ud83d\udcb3 Processing Time:</strong><br/>
                            Your refund will be returned to your original payment method.
                            ${estimatedText}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact info -->
                <tr>
                  <td style="padding:0 0 12px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1c1917;font-family:Arial,sans-serif;">
                      Have questions?
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;border-top:1px solid #e7e5e4;margin-top:20px;padding-top:20px;">
                    <p style="margin:0;font-size:14px;color:#44403c;font-family:Arial,sans-serif;line-height:1.6;">
                      If you don't see the refund in your account after the expected time,
                      or if you have any questions, please contact us at
                      <a href="mailto:info@hindutemple.ie" style="color:#059669;text-decoration:none;">info@hindutemple.ie</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="fafaf9" style="background:#fafaf9;border-top:1px solid #e7e5e4;padding:24px 40px;text-align:center;">
              ${footerInner({
                mainText: `This confirmation was sent to ${p.customerEmail}.`,
                subText: 'Thank you for your business.',
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
export function buildRefundEmailText(p: RefundEmailParams): string {
  const estimatedText = p.estimatedDays
    ? `Refunds typically appear within ${p.estimatedDays} business days.`
    : 'Refunds typically appear within 3-5 business days.'

  const referenceRow = p.referenceNumber ? `\nReference: ${p.referenceNumber}` : ''

  return `REFUND PROCESSED

Hi ${p.customerName},

We have processed your refund. ${estimatedText}

REFUND SUMMARY:
Item:            ${p.itemDescription}
Original Amount: €${p.originalAmount.toFixed(2)}
Refund Amount:   €${p.refundAmount.toFixed(2)}${referenceRow}

PROCESSING:
Your refund will be returned to your original payment method.
${estimatedText}

Have questions?
If you don't see the refund in your account after the expected time,
or if you have any questions, contact info@hindutemple.ie

Thank you for your business.
Hindu Association of Ireland
`
}
