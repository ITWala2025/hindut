/**
 * netlify/functions/lib/paymentStatusEmailTemplate.ts
 *
 * HTML + plain-text email templates for payment status notifications:
 *   - Payment failed
 *   - Payment canceled
 *   - Subscription canceled
 */

import { logoRow, footerInner } from './emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PaymentFailedEmailParams {
  customerName: string
  customerEmail: string
  itemType: 'membership' | 'donation' | 'ticket'  // e.g. "Annual Membership"
  itemName: string       // e.g. "Annual Membership"
  amount: number         // in EUR
  referenceNumber?: string
  failureReason?: string // e.g. "Card declined"
  retryUrl?: string      // URL to retry payment
}

export interface PaymentCanceledEmailParams {
  customerName: string
  customerEmail: string
  itemType: 'membership' | 'donation'
  itemName: string
  cancelReason?: string
  supportUrl?: string
}

// ---------------------------------------------------------------------------
// Payment Failed - HTML
// ---------------------------------------------------------------------------
export function buildPaymentFailedEmailHtml(p: PaymentFailedEmailParams): string {
  const retryButton = p.retryUrl
    ? `<tr>
        <td style="padding:24px 0 0;text-align:center;">
          <a href="${p.retryUrl}"
             style="display:inline-block;padding:14px 32px;background:#ea580c;color:#fff;
                     text-decoration:none;font-weight:700;
                     font-family:Arial,sans-serif;font-size:14px;">
            Retry Payment
          </a>
        </td>
      </tr>`
    : ''

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
  <title>Payment Failed – Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;width:100%;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center" style="padding:0;">

        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background:#ffffff;width:600px;">

          ${logoRow()}

          <!-- Header - Red/Error theme (Outlook-safe solid color) -->
          <tr>
            <td style="background:#dc2626;padding:28px 40px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;color:#ffffff;font-family:Arial,sans-serif;line-height:1.2;">
                Payment Status
              </p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;line-height:1.3;">
                Payment Could Not Be Processed
              </h1>
              <p style="margin:0;font-size:13px;color:#fecaca;font-family:Arial,sans-serif;">
                Your ${p.itemType} transaction failed
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

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;
                               font-family:Arial,sans-serif;">
                      Unfortunately, your payment for <strong>${p.itemName}</strong> could not be processed.
                      Please review the details below and try again.
                    </p>
                  </td>
                </tr>

                <!-- Error Box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fca5a5;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#991b1b;font-family:Arial,sans-serif;">
                            ⚠️ Payment Failed
                          </p>
                          <p style="margin:0;font-size:14px;color:#7f1d1d;font-family:Arial,sans-serif;
                                     line-height:1.6;">
                            ${p.failureReason || 'Your payment method was declined. Please check your card details and try again.'}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Payment Details -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 12px;font-size:13px;color:#78716c;text-transform:uppercase;font-family:Arial,sans-serif;">
                      Transaction Details
                    </p>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;">
                      <tr>
                        <td style="padding:12px 16px;border-bottom:1px solid #e7e5e4;">
                          <span style="font-size:12px;color:#78716c;text-transform:uppercase;font-family:Arial,sans-serif;">Item</span>
                          &nbsp; <span style="font-size:14px;color:#1c1917;font-family:Arial,sans-serif;">
                            ${p.itemName}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px;border-bottom:1px solid #e7e5e4;">
                          <span style="font-size:12px;color:#78716c;text-transform:uppercase;
                                       letter-spacing:1px;font-family:Arial,sans-serif;">Amount</span>
                          &nbsp; <span style="font-size:18px;font-weight:700;color:#dc2626;
                                       font-family:Arial,sans-serif;">
                            €${p.amount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                      ${referenceRow}
                    </table>
                  </td>
                </tr>

                <!-- Help section -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1c1917;font-family:Arial,sans-serif;">
                      What can you do?
                    </p>
                    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;line-height:1.8;">
                      <li>Check that your card details are correct</li>
                      <li>Ensure your card is not expired</li>
                      <li>Contact your bank if you see unusual activity</li>
                      <li>Try a different payment method</li>
                    </ul>
                  </td>
                </tr>

                ${retryButton}

                <!-- Support -->
                <tr>
                  <td style="padding:20px 0 0;border-top:1px solid #e7e5e4;margin-top:20px;
                              padding-top:20px;">
                    <p style="margin:0;font-size:14px;color:#44403c;font-family:Arial,sans-serif;
                               line-height:1.6;">
                      Need help? Contact our support team at
                      <a href="mailto:info@hindutemple.ie"
                         style="color:#ea580c;text-decoration:none;">info@hindutemple.ie</a>
                      or visit our website for assistance.
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
                mainText: `This notification was sent to ${p.customerEmail}.`,
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
// Payment Failed - Plain Text
// ---------------------------------------------------------------------------
export function buildPaymentFailedEmailText(p: PaymentFailedEmailParams): string {
  const referenceRow = p.referenceNumber ? `\nReference: ${p.referenceNumber}` : ''

  return `PAYMENT FAILED

Hi ${p.customerName},

Unfortunately, your payment for ${p.itemName} could not be processed.

FAILURE REASON:
${p.failureReason || 'Your payment method was declined. Please check your card details and try again.'}

TRANSACTION DETAILS:
Item:    ${p.itemName}
Amount:  €${p.amount.toFixed(2)}${referenceRow}

WHAT CAN YOU DO?
• Check that your card details are correct
• Ensure your card is not expired
• Contact your bank if you see unusual activity
• Try a different payment method

${p.retryUrl ? `\nRetry Payment: ${p.retryUrl}\n` : ''}
Need help? Contact info@hindutemple.ie

Hindu Association of Ireland
`
}

// ---------------------------------------------------------------------------
// Subscription Canceled - HTML
// ---------------------------------------------------------------------------
export function buildSubscriptionCanceledEmailHtml(p: PaymentCanceledEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Subscription Canceled – Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;">

          ${logoRow()}

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 40px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;
                         color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;">
                Subscription Update
              </p>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;
                          font-family:Arial,sans-serif;line-height:1.3;">
                ${p.itemType === 'membership' ? 'Membership Canceled' : 'Donation Canceled'}
              </h1>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);
                         font-family:Arial,sans-serif;">
                Your ${p.itemName} has been canceled
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
                      Hi <strong>${p.customerName}</strong>,
                    </p>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;
                               font-family:Arial,sans-serif;">
                      Your <strong>${p.itemName}</strong> has been canceled as requested.
                      ${p.cancelReason ? `Reason: ${p.cancelReason}` : ''}
                    </p>
                  </td>
                </tr>

                <!-- Info box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #e9d5ff;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:14px;color:#6b21a8;font-family:Arial,sans-serif;line-height:1.6;">
                            <strong>ℹ️ What's next?</strong><br/>
                            Your access will continue until the end of your current billing period.
                            After that, your subscription will not renew.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Reactivation option -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0 0 12px;font-size:14px;color:#44403c;font-family:Arial,sans-serif;">
                      We'd love to have you back. You can reactivate your ${p.itemType} at any time.
                    </p>
                  </td>
                </tr>

                <!-- Contact info -->
                <tr>
                  <td style="padding:20px 0 0;border-top:1px solid #e7e5e4;padding-top:20px;">
                    <p style="margin:0;font-size:14px;color:#44403c;font-family:Arial,sans-serif;line-height:1.6;">
                      If you canceled by mistake or have questions,
                      contact us at
                      <a href="mailto:info@hindutemple.ie" style="color:#7c3aed;text-decoration:none;">info@hindutemple.ie</a>
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
                mainText: `This confirmation was sent to ${p.customerEmail}.`,
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
// Subscription Canceled - Plain Text
// ---------------------------------------------------------------------------
export function buildSubscriptionCanceledEmailText(p: PaymentCanceledEmailParams): string {
  return `${p.itemType === 'MEMBERSHIP' ? 'MEMBERSHIP CANCELED' : 'DONATION CANCELED'}

Hi ${p.customerName},

Your ${p.itemName} has been canceled as requested.
${p.cancelReason ? `\nReason: ${p.cancelReason}\n` : ''}

WHAT'S NEXT?
Your access will continue until the end of your current billing period.
After that, your subscription will not renew.

We'd love to have you back. You can reactivate your ${p.itemType} at any time.

If you canceled by mistake or have questions, contact us at info@hindutemple.ie

Hindu Association of Ireland
`
}
