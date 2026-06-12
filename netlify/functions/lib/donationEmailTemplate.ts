/**
 * netlify/functions/lib/donationEmailTemplate.ts
 *
 * HTML + plain-text donation confirmation email sent immediately after a
 * successful one-time or recurring donation payment via Stripe.
 */

import { logoRow, footerInner } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DonationEmailParams {
  donorName:    string   // e.g. "Priya Sharma"
  donorEmail:   string   // recipient address
  amountEur:    number   // e.g. 50
  recurring:    boolean  // true = monthly subscription
  description?: string   // e.g. "Supporting Limerick Hindu Temple"
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
export function buildDonationEmailHtml(p: DonationEmailParams): string {
  const typeLabel   = p.recurring ? 'Monthly Recurring Donation' : 'One-Time Donation'
  const description = p.description ?? 'Supporting the Limerick Hindu Temple project'

  const recurringNote = p.recurring
    ? `
                <!-- Recurring info -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;">
                      <tr>
                        <td bgcolor="f0fdf4" style="background:#f0fdf4;padding:14px 18px;">
                          <p style="margin:0;font-size:14px;color:#15803d;font-family:Arial,sans-serif;line-height:1.6;">
                            🔄 Your <strong>monthly donation of &euro;${p.amountEur.toFixed(2)}</strong>
                            will be charged automatically each month. To cancel or update, please
                            contact us at
                            <a href="mailto:info@hindutemple.ie" style="color:#15803d;text-decoration:none;">info@hindutemple.ie</a>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Thank You for Your Donation – Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#ffffff;overflow:hidden;">

          ${logoRow()}

          <!-- Header (Outlook-safe solid color) -->
          <tr>
            <td bgcolor="ea580c" style="background:#ea580c;padding:28px 40px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;color:#ffffff;font-family:Arial,sans-serif;">
                Om Shree Ganeshaya Namah
              </p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;line-height:1.3;">
                Thank You for Your Donation!
              </h1>
              <p style="margin:0;font-size:13px;color:#fecaca;font-family:Arial,sans-serif;">
                Your generosity makes a real difference.
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
                      Dear <strong>${p.donorName}</strong>,
                    </p>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;
                               font-family:Arial,sans-serif;">
                      Thank you for your generous ${p.recurring ? 'recurring ' : ''}donation to the
                      <strong>Hindu Association of Ireland (HAI)</strong>. Your contribution goes
                      directly toward building a permanent place of worship, cultural enrichment,
                      and spiritual learning for Hindu families across Ireland.
                    </p>
                  </td>
                </tr>

                <!-- Donation summary box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fdba74;">
                      <tr>
                        <td bgcolor="fff7ed" style="background:#fff7ed;padding:20px 24px;">
                          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#9a3412;font-family:Arial,sans-serif;">
                            Donation Received
                          </p>
                          <p style="margin:0 0 16px;font-size:28px;font-weight:700;color:#ea580c;font-family:Arial,sans-serif;">
                            &euro;${p.amountEur.toFixed(2)}
                          </p>
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;padding-bottom:6px;">
                                <strong>Type:</strong>&nbsp;&nbsp;${typeLabel}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;">
                                <strong>Purpose:</strong>&nbsp;&nbsp;${description}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${recurringNote}

                <!-- Impact -->
                <tr>
                  <td style="padding:0 0 12px;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#1c1917;
                               font-family:Arial,sans-serif;">
                      Your donation helps us:
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#fafaf9;border-radius:8px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0 0 10px;font-size:14px;color:#44403c;
                                     font-family:Arial,sans-serif;">
                            🛕 Build a permanent Hindu temple in Limerick
                          </p>
                          <p style="margin:0 0 10px;font-size:14px;color:#44403c;
                                     font-family:Arial,sans-serif;">
                            🪔 Fund weekly satsangs, poojas, and cultural festivals
                          </p>
                          <p style="margin:0 0 10px;font-size:14px;color:#44403c;
                                     font-family:Arial,sans-serif;">
                            📚 Support spiritual and cultural education programs
                          </p>
                          <p style="margin:0;font-size:14px;color:#44403c;
                                     font-family:Arial,sans-serif;">
                            🌿 Create a welcoming home for Hindu families across Ireland
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
                      Your generosity is a true blessing to our community. May your kindness
                      bring you and your family abundant joy, health, and prosperity.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0 0;">
                    <p style="margin:0 0 4px;font-size:15px;color:#44403c;
                               font-family:Arial,sans-serif;">
                      With heartfelt gratitude,
                    </p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ea580c;
                               font-family:Arial,sans-serif;">
                      Team HAI
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#78716c;
                               font-family:Arial,sans-serif;">
                      Hindu Association of Ireland · info@hindutemple.ie
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
                mainText: `This receipt was sent to ${p.donorEmail}. Hindu Association of Ireland · Limerick, Ireland.`,
                subText:  'Your data is handled in accordance with GDPR and will not be shared with third parties.',
              })}
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`
}

// ---------------------------------------------------------------------------
// Plain-text fallback
// ---------------------------------------------------------------------------
export function buildDonationEmailText(p: DonationEmailParams): string {
  const typeLabel   = p.recurring ? 'Monthly Recurring Donation' : 'One-Time Donation'
  const description = p.description ?? 'Supporting the Limerick Hindu Temple project'

  const recurringLine = p.recurring
    ? `\nYour monthly donation will be charged automatically each month.\nTo cancel, contact info@hindutemple.ie.\n`
    : ''

  return `Om Shree Ganeshaya Namah

Dear ${p.donorName},

Thank you for your generous ${p.recurring ? 'recurring ' : ''}donation to the
Hindu Association of Ireland (HAI).

DONATION RECEIVED: €${p.amountEur.toFixed(2)}
Type:    ${typeLabel}
Purpose: ${description}
${recurringLine}
Your donation helps us:
  • Build a permanent Hindu temple in Limerick
  • Fund weekly satsangs, poojas, and cultural festivals
  • Support spiritual and cultural education programs
  • Create a welcoming home for Hindu families across Ireland

Your generosity is a true blessing to our community.
May your kindness bring you and your family abundant joy and prosperity.

With heartfelt gratitude,
Team HAI
Hindu Association of Ireland · info@hindutemple.ie

Om Shanti
`
}
