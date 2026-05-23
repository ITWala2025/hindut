/**
 * netlify/functions/activate-role.ts
 *
 * Validates a role-activation token, assigns the role in user_roles,
 * updates the user's app_metadata, marks the invitation as activated,
 * and sends a confirmation email.
 *
 * Route:
 *   GET  /activate-role?token=<hex-token>
 *
 * Returns JSON: { ok: true, role: string, email: string }
 *           or: { ok: false, error: string }
 *
 * The frontend /activate-role page calls this endpoint after the user
 * arrives via the activation link (from either a Supabase invite email
 * redirect or a role-change email).
 */

import type { Handler } from '@netlify/functions'
import nodemailer from 'nodemailer'
import { supabaseAdmin, jsonHeaders } from './lib/stripe.js'

// ---------------------------------------------------------------------------
// SMTP helpers
// ---------------------------------------------------------------------------
function createMailTransporter() {
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

const FROM_ADDRESS = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@hindutemple.ie'
const ORG_NAME     = 'Hindu Association of Ireland'

/** Confirmation email sent after the role is successfully activated. */
async function sendActivationConfirmationEmail(opts: {
  toEmail: string
  role:    string
  siteUrl: string
}) {
  const roleLabel =
    opts.role === 'super_admin' ? 'Super Admin'
    : opts.role === 'admin'     ? 'Admin'
    : 'Editor'

  const loginUrl = `${opts.siteUrl}/admin`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Account Activated — ${ORG_NAME}</title></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#ea580c,#d97706);padding:32px 32px 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#fed7aa;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">Hindu Association of Ireland</p>
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">Your Account Is Active</h1>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
          Great news! Your <strong>${roleLabel}</strong> access to the ${ORG_NAME} Admin Portal has been activated.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
          You can now sign in to the admin portal using your email address.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr><td style="background:linear-gradient(135deg,#ea580c,#d97706);border-radius:8px;">
            <a href="${loginUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">Sign In to Admin Portal</a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">
          If you have any questions, please contact the portal administrator.
        </p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 32px;border-top:1px solid #f5f5f4;text-align:center;">
        <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">Hindu Association of Ireland · Limerick</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  const text = `Account Activated — ${ORG_NAME}\n\nYour ${roleLabel} access has been activated.\n\nSign in here: ${loginUrl}`

  const transporter = createMailTransporter()
  await transporter.sendMail({
    from:    `"${ORG_NAME}" <${FROM_ADDRESS}>`,
    to:      opts.toEmail,
    subject: `Your ${roleLabel} account is now active — ${ORG_NAME} Admin Portal`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const token = event.queryStringParameters?.token
  if (!token) {
    return {
      statusCode: 400,
      headers:    jsonHeaders,
      body:       JSON.stringify({ ok: false, error: 'Missing token parameter' }),
    }
  }

  const supabase = supabaseAdmin()
  const SITE_URL = process.env.URL ?? 'https://limerickhindutemple.netlify.app'

  // Find the pending invitation
  const { data: inv, error: invErr } = await supabase
    .from('role_invitations')
    .select('*')
    .eq('token', token)
    .is('activated_at', null)
    .maybeSingle()

  if (invErr) {
    console.error('[activate-role] DB lookup error:', invErr.message)
    return {
      statusCode: 500,
      headers:    jsonHeaders,
      body:       JSON.stringify({ ok: false, error: 'Database error. Please try again.' }),
    }
  }

  if (!inv) {
    return {
      statusCode: 404,
      headers:    jsonHeaders,
      body:       JSON.stringify({ ok: false, error: 'Activation link is invalid or has already been used.' }),
    }
  }

  type InvRow = {
    id: string; email: string; user_id: string | null; role: string;
    kind: string; invited_by: string | null; expires_at: string;
  }
  const invitation = inv as InvRow

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    return {
      statusCode: 410,
      headers:    jsonHeaders,
      body:       JSON.stringify({ ok: false, error: 'This activation link has expired. Please ask an admin to send a new one.' }),
    }
  }

  const userId = invitation.user_id
  if (!userId) {
    return {
      statusCode: 400,
      headers:    jsonHeaders,
      body:       JSON.stringify({ ok: false, error: 'User account not found. Please complete sign-up first.' }),
    }
  }

  // Assign (or update) role in user_roles table
  const { error: roleErr } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: invitation.role }, { onConflict: 'user_id' })

  if (roleErr) {
    console.error('[activate-role] user_roles upsert error:', roleErr.message)
    return {
      statusCode: 500,
      headers:    jsonHeaders,
      body:       JSON.stringify({ ok: false, error: 'Failed to assign role. Please try again.' }),
    }
  }

  // Sync role into app_metadata so JWT claims are up-to-date
  const { error: metaErr } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: invitation.role },
  })
  if (metaErr) {
    // Non-fatal: log but continue — user_roles is the source of truth
    console.warn('[activate-role] app_metadata update failed:', metaErr.message)
  }

  // Mark the invitation as activated
  await supabase
    .from('role_invitations')
    .update({ activated_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Send "account activated" confirmation email
  try {
    await sendActivationConfirmationEmail({
      toEmail: invitation.email,
      role:    invitation.role,
      siteUrl: SITE_URL,
    })
  } catch (emailErr) {
    // Non-fatal: role is already assigned; email failure shouldn't block success
    console.error('[activate-role] confirmation email failed:', (emailErr as Error).message)
  }

  return {
    statusCode: 200,
    headers:    jsonHeaders,
    body:       JSON.stringify({ ok: true, role: invitation.role, email: invitation.email }),
  }
}
