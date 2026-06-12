/**
 * netlify/functions/lib/contactEmailTemplate.ts
 *
 * HTML + plain-text email templates for contact form submissions.
 * Sends two emails:
 *   1. Confirmation to the visitor who submitted the form
 *   2. Admin notification to the organization's email
 */

import { logoRow, footerInner, getSiteUrl } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ContactEmailParams {
  visitorName: string
  visitorEmail: string
  visitorPhone?: string
  subject: string
  message: string
  submittedAt: string
}

// ---------------------------------------------------------------------------
// Confirmation email to visitor (HTML)
// ---------------------------------------------------------------------------
export function buildVisitorConfirmationHtml(p: ContactEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Message Received \u2013 Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;width:100%;">

  <!-- Wrapper -->
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Card (Outlook-safe: fixed width, no border-radius, no box-shadow) -->
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background:#ffffff;width:600px;">

          ${logoRow()}

          <!-- Header (solid color instead of gradient) -->
          <tr>
            <td bgcolor="ea580c" style="background:#ea580c;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">
                Thank You!
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#fff7ed;font-family:Arial,sans-serif;\">
                We've received your message
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;\">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 0 20px;\">
                    <p style="margin:0;font-size:16px;color:#1c1917;font-family:Arial,sans-serif;\">
                      Hi <strong>${escapeHtml(p.visitorName)}</strong>,
                    </p>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 24px;\">
                    <p style="margin:0;font-size:14px;color:#78716c;font-family:Arial,sans-serif;line-height:1.6;\">
                      Thank you for reaching out to us! We've received your message and will review it carefully.
                    </p>
                  </td>
                </tr>

                <!-- Message summary -->
                <tr>
                  <td style="padding:0 0 24px;\">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fafaf9;border-left:4px solid #ea580c;padding:16px;\">
                      <tr>
                        <td bgcolor="fafaf9" style="background:#fafaf9;padding:0;">
                          <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#a8a29e;font-family:Arial,sans-serif;text-transform:uppercase;\">
                            Your Message
                          </p>
                          <p style="margin:0 0 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;font-weight:600;\">
                            <strong>Subject:</strong> ${escapeHtml(p.subject)}
                          </p>
                          <div style="font-size:13px;color:#57534e;font-family:Arial,sans-serif;line-height:1.6;word-wrap:break-word;\">
${escapeHtml(p.message)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Next steps -->
                <tr>
                  <td style="padding:0 0 24px;border-top:1px solid #f5f5f4;padding-top:24px;\">
                    <p style="margin:0 0 12px;font-size:14px;color:#78716c;font-family:Arial,sans-serif;line-height:1.6;\">
                      Our team typically responds within 24-48 hours. If your inquiry is urgent, please call us at:
                    </p>
                    <p style="margin:0;font-size:14px;color:#ea580c;font-family:Arial,sans-serif;font-weight:600;\">
                      (087) 495 3334
                    </p>
                  </td>
                </tr>

                <!-- Contact info -->
                <tr>
                  <td style="padding:24px;background:#fff7ed;text-align:center;" bgcolor="fff7ed">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#a8a29e;font-family:Arial,sans-serif;text-transform:uppercase;\">
                      Our Contact Details
                    </p>
                    <p style="margin:0;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;line-height:1.6;\">
                      Hindu Association of Ireland<br />
                      4 Upper Denmark Street<br />
                      Co. Limerick, Ireland<br />
                      <a href="mailto:donation@hindutemple.ie\" style=\"color:#ea580c;text-decoration:none;\">donation@hindutemple.ie</a>
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
                mainText: 'Hindu Association of Ireland \u00b7 Limerick, Ireland',
                subText: 'This email was sent because you submitted a contact form on our website. Your data is processed in accordance with GDPR.',
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
// Confirmation email to visitor (plain text)
// ---------------------------------------------------------------------------
export function buildVisitorConfirmationText(p: ContactEmailParams): string {
  return `Thank You for Contacting Us!

Hi ${p.visitorName},

Thank you for reaching out to us! We've received your message and will review it carefully.

YOUR MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: ${p.subject}

${p.message}

NEXT STEPS
Our team typically responds within 24-48 hours. If your inquiry is urgent, please call us at:
(087) 495 3334

CONTACT US
Hindu Association of Ireland
4 Upper Denmark Street
Co. Limerick, Ireland
Email: donation@hindutemple.ie
Website: ${getSiteUrl()}

---
This email was sent because you submitted a contact form on our website.
Your data is processed in accordance with GDPR and will not be shared with third parties.
`
}

// ---------------------------------------------------------------------------
// Admin notification email (HTML)
// ---------------------------------------------------------------------------
export function buildAdminNotificationHtml(p: ContactEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Contact Form Submission</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">

          ${logoRow()}

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #ea580c 0%, #f97316 100%);padding:32px 40px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">
                📬 New Contact Form Submission
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Visitor info -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#a8a29e;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">
                      Visitor Information
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:4px;">
                      <tr>
                        <td style="padding:12px;border-bottom:1px solid #e7e5e4;background:#f9f8f7;">
                          <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">Name</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;font-weight:600;">
                            ${escapeHtml(p.visitorName)}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px;border-bottom:1px solid #e7e5e4;">
                          <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">Email</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
                            <a href="mailto:${escapeHtml(p.visitorEmail)}" style="color:#ea580c;text-decoration:none;">
                              ${escapeHtml(p.visitorEmail)}
                            </a>
                          </p>
                        </td>
                      </tr>
                      ${p.visitorPhone ? `<tr>
                        <td style="padding:12px;border-bottom:1px solid #e7e5e4;">
                          <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">Phone</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
                            <a href="tel:${escapeHtml(p.visitorPhone)}" style="color:#ea580c;text-decoration:none;">
                              ${escapeHtml(p.visitorPhone)}
                            </a>
                          </p>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:12px;">
                          <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">Submitted</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
                            ${new Date(p.submittedAt).toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#a8a29e;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">
                      Message
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border-left:4px solid #ea580c;border-radius:4px;padding:16px;">
                      <tr>
                        <td>
                          <p style="margin:0 0 12px;font-size:13px;color:#1c1917;font-family:Arial,sans-serif;font-weight:600;">
                            <strong>Subject:</strong> ${escapeHtml(p.subject)}
                          </p>
                          <div style="font-size:13px;color:#57534e;font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;">
${escapeHtml(p.message)}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Action link -->
                <tr>
                  <td style="padding:24px;background:#fff7ed;border-radius:6px;text-align:center;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#a8a29e;font-family:Arial,sans-serif;text-transform:uppercase;">
                      Quick Reply
                    </p>
                    <a href="mailto:${escapeHtml(p.visitorEmail)}?subject=Re%3A%20${encodeURIComponent(p.subject)}" style="display:inline-block;padding:10px 20px;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600;font-size:13px;">
                      Reply to ${escapeHtml(p.visitorName.split(' ')[0])}
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafaf9;border-top:1px solid #e7e5e4;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a8a29e;font-family:Arial,sans-serif;">
                This is an admin notification — no action required unless you wish to respond.
              </p>
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
// Admin notification email (plain text)
// ---------------------------------------------------------------------------
export function buildAdminNotificationText(p: ContactEmailParams): string {
  return `NEW CONTACT FORM SUBMISSION

VISITOR INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:      ${p.visitorName}
Email:     ${p.visitorEmail}
${p.visitorPhone ? `Phone:     ${p.visitorPhone}\n` : ''}Submitted:  ${new Date(p.submittedAt).toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })}

MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: ${p.subject}

${p.message}

REPLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To reply, send an email to: ${p.visitorEmail}
`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
