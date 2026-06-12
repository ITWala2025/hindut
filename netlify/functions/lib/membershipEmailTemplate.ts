/**
 * netlify/functions/lib/membershipEmailTemplate.ts
 *
 * HTML + plain-text welcome email templates sent after a successful
 * membership payment.  Edit brand colours and copy here — no code
 * changes needed elsewhere.
 */

import { logoRow, footerInner } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface MembershipWelcomeEmailParams {
  memberName:  string   // e.g. "Priya Sharma"
  memberCode:  string   // e.g. "HAI-M-0001"
  memberEmail: string   // recipient address
  planName:    string   // e.g. "Annual"
  addedMonthly: boolean // true if they also signed up for a monthly donation
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
export function buildMembershipWelcomeEmailHtml(p: MembershipWelcomeEmailParams): string {
  const monthlySection = p.addedMonthly
    ? `<tr>
        <td style="padding:0 0 20px;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
            Your ongoing monthly support will directly help us build the Hindu Cultural &amp; Spiritual
            Centre in Limerick, enabling spiritual, cultural, and educational programs for our community.
            <strong>Thank you for your generous commitment.</strong>
          </p>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to the Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;overflow:hidden;">

          ${logoRow()}

          <!-- Header (Outlook-safe solid color) -->
          <tr>
            <td bgcolor="ea580c" style="background:#ea580c;padding:28px 40px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;color:#ffffff;font-family:Arial,sans-serif;">
                Om Shree Ganeshaya Namah
              </p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;line-height:1.3;">
                Welcome to the HAI Community!
              </h1>
              <p style="margin:0;font-size:13px;color:#fecaca;font-family:Arial,sans-serif;">
                Hindu Association of Ireland
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
                      Dear <strong>${p.memberName}</strong>,
                    </p>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      We are delighted to welcome you to the Hindu Association of Ireland (HAI) community!
                      Thank you for becoming a member and supporting the development of our temple and cultural
                      initiatives. Your contribution helps us build a permanent place of worship, a hub for
                      cultural and spiritual learning, and a vibrant community for generations to come.
                    </p>
                  </td>
                </tr>

                <!-- Member ID box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fdba74;">
                      <tr>
                        <td bgcolor="fff7ed" style="background:#fff7ed;padding:16px 20px;">
                          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#9a3412;font-family:Arial,sans-serif;">
                            Your Member ID
                          </p>
                          <p style="margin:0;font-size:22px;font-weight:700;color:#ea580c;font-family:'Courier New',monospace;letter-spacing:1px;">
                            ${p.memberCode}
                          </p>
                          <p style="margin:6px 0 0;font-size:12px;color:#92400e;font-family:Arial,sans-serif;">
                            ${p.planName} Membership · Please keep this ID for your records.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Benefits heading -->
                <tr>
                  <td style="padding:0 0 12px;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#1c1917;font-family:Arial,sans-serif;">
                      As a valued member, you will enjoy:
                    </p>
                  </td>
                </tr>

                <!-- Benefits list -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fafaf9;">
                      <tr>
                        <td bgcolor="fafaf9" style="background:#fafaf9;padding:16px 20px;">
                          <p style="margin:0 0 10px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                            🪔 <strong>Monthly Nama–Nakshatra Archana</strong> for your family
                          </p>
                          <p style="margin:0 0 10px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                            🪔 <strong>One Special Occasion Archana</strong> per year
                            (birthday, anniversary, new home, etc.)
                          </p>
                          <p style="margin:0 0 10px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                            🌳 <strong>Recognition on the Karpaga Vriksham</strong> installation in the new
                            temple, where your family's name and thumb impression will be represented as a leaf
                          </p>
                          <p style="margin:0;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                            💛 <strong>Updates</strong> on temple events, festivals, and community programs
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Monthly giving section (conditional) -->
                ${monthlySection}

                <!-- Stay connected -->
                <tr>
                  <td style="padding:0 0 12px;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#1c1917;font-family:Arial,sans-serif;">
                      We invite you to stay connected:
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 8px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                      🌐 Visit our website for updates on events, poojas, and volunteering opportunities
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                      📣 Follow us on social media for photos and announcements
                    </p>
                    <p style="margin:0;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                      💬 Share your ideas and suggestions with us anytime
                    </p>
                  </td>
                </tr>

                <!-- Closing -->
                <tr>
                  <td style="padding:0 0 8px;border-top:1px solid #e7e5e4;padding-top:20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      Once again, thank you for joining our community and for supporting the HAI mission.
                      Together, we are creating a spiritual, cultural, and social home for all Hindu families
                      in Ireland.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 0 0;">
                    <p style="margin:0 0 4px;font-size:15px;color:#44403c;font-family:Arial,sans-serif;">
                      With blessings and gratitude,
                    </p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ea580c;font-family:Arial,sans-serif;">
                      Team HAI
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">
                      Hindu Association of Ireland
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
                mainText: `This email was sent to ${p.memberEmail} because you joined as a member of the Hindu Association of Ireland.`,
                subText:  `Please keep your Member ID (${p.memberCode}) safe.`,
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
export function buildMembershipWelcomeEmailText(p: MembershipWelcomeEmailParams): string {
  const monthlyLine = p.addedMonthly
    ? `\nYour ongoing monthly support will directly help us build the Hindu Cultural & Spiritual Centre in Limerick.\n`
    : ''

  return `Om Shree Ganeshaya Namah

Dear ${p.memberName},

We are delighted to welcome you to the Hindu Association of Ireland (HAI) community!
Thank you for becoming a member and supporting the development of our temple and cultural
initiatives.

YOUR MEMBER ID: ${p.memberCode}
Membership Plan: ${p.planName}
Please keep this ID for your records.

As a valued member, you will enjoy:
  • Monthly Nama-Nakshatra Archana for your family
  • One Special Occasion Archana per year (birthday, anniversary, new home, etc.)
  • Recognition on the Karpaga Vriksham installation in the new temple
  • Updates on temple events, festivals, and community programs
${monthlyLine}
We invite you to stay connected:
  • Visit our website for updates on events, poojas, and volunteering opportunities
  • Follow us on social media for photos and announcements
  • Share your ideas and suggestions with us anytime

Once again, thank you for joining our community and for supporting the HAI mission.
Together, we are creating a spiritual, cultural, and social home for all Hindu families
in Ireland.

With blessings and gratitude,
Team HAI
Hindu Association of Ireland
`
}
