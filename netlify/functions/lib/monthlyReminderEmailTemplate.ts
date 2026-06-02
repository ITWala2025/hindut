/**
 * netlify/functions/lib/monthlyReminderEmailTemplate.ts
 *
 * HTML + plain-text reminder email sent 3 days before each monthly
 * contribution charge. Triggered by the Stripe invoice.upcoming webhook.
 */

export interface MonthlyReminderEmailParams {
  memberName:   string  // e.g. "Priya Sharma"
  memberEmail:  string  // recipient address
  amountEur:    number  // e.g. 25
  chargeDate:   string  // human-readable, e.g. "1 July 2026"
  planName:     string  // e.g. "Annual"
}

export function buildMonthlyReminderEmailHtml(p: MonthlyReminderEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Upcoming Monthly Contribution – Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c,#d97706);padding:36px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;
                         color:#fed7aa;font-family:Arial,sans-serif;">
                Om Shree Ganeshaya Namah
              </p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;
                          line-height:1.3;">
                Upcoming Monthly Contribution
              </h1>
              <p style="margin:12px 0 0;font-size:14px;color:#fed7aa;font-family:Arial,sans-serif;">
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
                      Dear ${p.memberName},
                    </p>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      This is a friendly reminder that your monthly contribution to the
                      <strong>Hindu Association of Ireland</strong> is scheduled to be charged
                      in <strong>3 days</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Payment details box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;
                                     letter-spacing:1px;color:#9a3412;font-family:Arial,sans-serif;">
                            Payment Schedule
                          </p>
                          <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ea580c;
                                     font-family:Arial,sans-serif;">
                            &euro;${p.amountEur.toFixed(2)}
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;
                                          padding-bottom:6px;">
                                <strong>Charge date:</strong>&nbsp;&nbsp;${p.chargeDate}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;
                                          padding-bottom:6px;">
                                <strong>Membership plan:</strong>&nbsp;&nbsp;${p.planName}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;">
                                <strong>Frequency:</strong>&nbsp;&nbsp;Monthly, recurring
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Info note -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#57534e;font-family:Arial,sans-serif;">
                      No action is needed — this is a courtesy notification only. Your payment
                      will be processed automatically using the payment method on file.
                    </p>
                    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#57534e;font-family:Arial,sans-serif;">
                      If you wish to cancel or update your contribution, please contact us at
                      <a href="mailto:info@hindutemple.ie"
                         style="color:#ea580c;text-decoration:none;">info@hindutemple.ie</a>
                      before the charge date.
                    </p>
                  </td>
                </tr>

                <!-- Thank you note -->
                <tr>
                  <td style="padding:0 0 24px;border-top:1px solid #e7e5e4;padding-top:20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      Your continued generosity sustains our weekly satsangs, community prayers,
                      cultural festivals, and the long-term mission of establishing a permanent
                      Hindu Temple in Limerick. <strong>Thank you for your ongoing support.</strong>
                    </p>
                  </td>
                </tr>

                <!-- Sign-off -->
                <tr>
                  <td style="padding:0;">
                    <p style="margin:0 0 4px;font-size:15px;color:#44403c;font-family:Arial,sans-serif;">
                      With blessings and gratitude,
                    </p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ea580c;font-family:Arial,sans-serif;">
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
            <td style="background:#fafaf9;border-top:1px solid #e7e5e4;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">
                Om Shanti &mdash; May you be blessed with peace and prosperity.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#a8a29e;font-family:Arial,sans-serif;">
                Hindu Association of Ireland &middot; Limerick, Ireland
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

export function buildMonthlyReminderEmailText(p: MonthlyReminderEmailParams): string {
  return [
    'Om Shree Ganeshaya Namah',
    '',
    `Dear ${p.memberName},`,
    '',
    'This is a friendly reminder that your monthly contribution to the',
    'Hindu Association of Ireland is scheduled to be charged in 3 days.',
    '',
    '--- Payment Details ---',
    `Amount:        €${p.amountEur.toFixed(2)}`,
    `Charge date:   ${p.chargeDate}`,
    `Plan:          ${p.planName}`,
    `Frequency:     Monthly, recurring`,
    '',
    'No action is needed — this is a courtesy notification only.',
    'Your payment will be processed automatically.',
    '',
    'To cancel or update your contribution, please contact us at',
    'info@hindutemple.ie before the charge date.',
    '',
    'Your generosity sustains our community. Thank you.',
    '',
    'With blessings and gratitude,',
    'Team HAI',
    'Hindu Association of Ireland · info@hindutemple.ie',
    '',
    'Om Shanti',
  ].join('\n')
}
