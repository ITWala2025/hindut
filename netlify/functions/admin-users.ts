/**
 * netlify/functions/admin-users.ts
 *
 * Admin user management — list Supabase Auth users, invite new users,
 * assign roles to existing users, and delete users.
 *
 * Routes:
 *   GET    /admin-users                             — list all auth users + roles
 *   POST   /admin-users  { kind:'invite', ... }     — invite a new user
 *   POST   /admin-users  { kind:'assign-role', ... } — send role-verification email to existing user
 *   DELETE /admin-users?userId=<uuid>               — delete a user from Supabase Auth
 *
 * All routes require a valid admin Bearer token.  Only super_admin may
 * invite / assign / delete users.
 */

import type { Handler } from '@netlify/functions'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import { supabaseAdmin, jsonHeaders } from './lib/stripe.js'
import { logoRow, footerInner } from './lib/emailBase.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PermAction = 'view' | 'create' | 'update' | 'delete'

type AuthResult =
  | { ok: true; userId: string; callerEmail: string }
  | { ok: false; status: 401 | 403; reason: string }

// ---------------------------------------------------------------------------
// Auth helper — validates Bearer token and checks role permissions
// ---------------------------------------------------------------------------
async function requirePermission(
  authHeader: string | undefined,
  action: PermAction,
): Promise<AuthResult> {
  if (!authHeader) return { ok: false, status: 401, reason: 'No Authorization header' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, reason: 'Empty bearer token' }

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, reason: userErr?.message ?? 'Token validation failed' }
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const role: string | undefined =
    (roleRow as { role?: string } | null)?.role ||
    (userData.user.app_metadata?.role as string | undefined)

  if (!role) {
    return { ok: false, status: 403, reason: `No role found for user ${userData.user.id}` }
  }

  // Super admin can do everything
  if (role === 'super_admin') {
    return { ok: true, userId: userData.user.id, callerEmail: userData.user.email ?? '' }
  }

  // For user management, only super_admin is allowed for create/update/delete
  // Admin can view users
  if (action === 'view' && (role === 'admin' || role === 'editor')) {
    return { ok: true, userId: userData.user.id, callerEmail: userData.user.email ?? '' }
  }

  return { ok: false, status: 403, reason: `Role '${role}' is not authorised to ${action} users` }
}

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

/** Email sent to the user when a super_admin assigns them a role (existing user). */
async function sendRoleAssignmentEmail(opts: {
  toEmail:     string
  role:        string
  activationUrl: string
  invitedBy:   string
}) {
  const roleLabel =
    opts.role === 'super_admin' ? 'Super Admin'
    : opts.role === 'admin'     ? 'Admin'
    : 'Editor'

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Role Assignment — ${ORG_NAME}</title></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      ${logoRow()}
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#ea580c,#d97706);padding:24px 32px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Hindu Association of Ireland</p>
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">Admin Portal Access</h1>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
          You have been assigned the <strong>${roleLabel}</strong> role in the ${ORG_NAME} Admin Portal by <strong>${opts.invitedBy}</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
          To activate your access, please click the button below. This link expires in 7 days.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr><td style="background:linear-gradient(135deg,#ea580c,#d97706);border-radius:8px;">
            <a href="${opts.activationUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">Activate My Access</a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">
          If you did not expect this email, you can safely ignore it.
        </p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 32px;border-top:1px solid #f5f5f4;text-align:center;">
        ${footerInner({ mainText: 'Hindu Association of Ireland · Limerick, Ireland' })}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  const text = `Admin Portal Access — ${ORG_NAME}\n\nYou have been assigned the ${roleLabel} role by ${opts.invitedBy}.\n\nActivate your access here:\n${opts.activationUrl}\n\nThis link expires in 7 days.`

  const transporter = createMailTransporter()
  await transporter.sendMail({
    from:    `"${ORG_NAME}" <${FROM_ADDRESS}>`,
    to:      opts.toEmail,
    subject: `You've been given ${roleLabel} access — ${ORG_NAME} Admin Portal`,
    html,
    text,
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...jsonHeaders, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' }, body: '' }
  }

  const supabase    = supabaseAdmin()
  const authHeader  = event.headers.authorization ?? event.headers.Authorization
  const SITE_URL    = process.env.URL ?? 'https://limerickhindutemple.netlify.app'

  // -------------------------------------------------------------------------
  // GET — list all Supabase Auth users with their roles and invitation status
  // -------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    const auth = await requirePermission(authHeader, 'view')
    if (!auth.ok) {
      return { statusCode: auth.status, headers: jsonHeaders, body: JSON.stringify({ error: auth.reason }) }
    }

    // Fetch all users from Supabase Auth (service role)
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (authErr) {
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: authErr.message }) }
    }

    // Fetch all role assignments
    const { data: roles } = await supabase.from('user_roles').select('user_id, role')
    const rolesMap: Record<string, string> = Object.fromEntries(
      (roles ?? []).map((r: { user_id: string; role: string }) => [r.user_id, r.role]),
    )

    // Fetch all pending invitations (not yet activated)
    const { data: invitations } = await supabase
      .from('role_invitations')
      .select('*')
      .is('activated_at', null)
      .gt('expires_at', new Date().toISOString())

    type InvRow = { id: string; email: string; user_id: string | null; role: string; kind: string; invited_by: string | null }
    const pendingByUserId: Record<string, InvRow> = {}
    const pendingByEmail: Record<string, InvRow>  = {}
    for (const inv of ((invitations ?? []) as InvRow[])) {
      if (inv.user_id) pendingByUserId[inv.user_id] = inv
      if (inv.email)   pendingByEmail[inv.email.toLowerCase()] = inv
    }

    const users = authData.users.map((u) => {
      const activeRole   = rolesMap[u.id] ?? null
      const pendingInvite = pendingByUserId[u.id] ?? pendingByEmail[u.email?.toLowerCase() ?? ''] ?? null
      return {
        id:             u.id,
        email:          u.email ?? '',
        full_name:      (u.user_metadata?.full_name ?? u.user_metadata?.name ?? '') as string,
        role:           activeRole,
        pending_role:   !activeRole && pendingInvite ? pendingInvite.role : null,
        status:         activeRole ? 'active' : pendingInvite ? 'pending' : 'unassigned',
        invited_by:     pendingInvite?.invited_by ?? null,
        created_at:     u.created_at,
        last_sign_in:   u.last_sign_in_at ?? null,
      }
    })

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify(users) }
  }

  // -------------------------------------------------------------------------
  // POST — invite new user or send role-change verification email
  // -------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    let body: Record<string, string>
    try {
      body = JSON.parse(event.body ?? '{}')
    } catch {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
    }

    // --- Invite new user (creates in Supabase Auth + sends Supabase invite email) ---
    if (body.kind === 'invite') {
      const auth = await requirePermission(authHeader, 'create')
      if (!auth.ok) {
        return { statusCode: auth.status, headers: jsonHeaders, body: JSON.stringify({ error: auth.reason }) }
      }

      const { email, name, role } = body
      if (!email || !role) {
        return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'email and role are required' }) }
      }

      // Generate a cryptographically secure activation token
      const tokenHex = randomBytes(32).toString('hex')

      // Use Supabase Auth invite — sends the magic-link invite email
      // redirectTo carries our token so we can activate the role after the user accepts.
      const redirectTo = `${SITE_URL}/activate-role?token=${tokenHex}`
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
        email.trim(),
        {
          redirectTo,
          data: { full_name: name?.trim() ?? '' },
        },
      )
      if (inviteErr) {
        return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: inviteErr.message }) }
      }

      // Persist the pending invitation so activate-role.ts can look it up
      const { error: dbErr } = await supabase.from('role_invitations').insert({
        token:      tokenHex,
        email:      email.trim().toLowerCase(),
        user_id:    inviteData.user.id,
        role,
        kind:       'invite',
        invited_by: auth.callerEmail,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (dbErr) {
        console.error('[admin-users] invite insert error:', dbErr.message)
        return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Failed to store invitation. Has the role_invitations migration been run in Supabase?' }) }
      }

      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true }) }
    }

    // --- Assign / change role for an existing Auth user ---
    if (body.kind === 'assign-role') {
      const auth = await requirePermission(authHeader, 'update')
      if (!auth.ok) {
        return { statusCode: auth.status, headers: jsonHeaders, body: JSON.stringify({ error: auth.reason }) }
      }

      const { userId, email, role } = body
      if (!userId || !email || !role) {
        return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'userId, email, and role are required' }) }
      }

      // Generate a cryptographically secure token
      const tokenHex = randomBytes(32).toString('hex')

      // Supersede any previous pending invitation for this user
      await supabase
        .from('role_invitations')
        .update({ activated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('activated_at', null)

      // Create new invitation record
      const { error: dbErr } = await supabase.from('role_invitations').insert({
        token:      tokenHex,
        email:      email.trim().toLowerCase(),
        user_id:    userId,
        role,
        kind:       'role-change',
        invited_by: auth.callerEmail,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (dbErr) {
        console.error('[admin-users] assign-role insert error:', dbErr.message, dbErr.code)
        return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: `DB error (${dbErr.code}): ${dbErr.message}` }) }
      }

      // Send verification email — wrap so a failed email doesn't crash the whole request
      const activationUrl = `${SITE_URL}/activate-role?token=${tokenHex}`
      try {
        await sendRoleAssignmentEmail({
          toEmail:      email.trim(),
          role,
          activationUrl,
          invitedBy:    auth.callerEmail,
        })
      } catch (emailErr) {
        console.error('[admin-users] role-assignment email failed:', (emailErr as Error).message)
        // Role invitation was stored; surface the activation URL so the admin can share it manually
        return {
          statusCode: 207,
          headers:    jsonHeaders,
          body:       JSON.stringify({
            ok:            true,
            warning:       'Role invitation created but the verification email could not be sent (SMTP not configured).',
            activationUrl,
          }),
        }
      }

      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid kind' }) }
  }

  // -------------------------------------------------------------------------
  // DELETE — remove a user from Supabase Auth
  // -------------------------------------------------------------------------
  if (event.httpMethod === 'DELETE') {
    const auth = await requirePermission(authHeader, 'delete')
    if (!auth.ok) {
      return { statusCode: auth.status, headers: jsonHeaders, body: JSON.stringify({ error: auth.reason }) }
    }

    const userId = event.queryStringParameters?.userId
    if (!userId) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'userId query parameter is required' }) }
    }
    if (userId === auth.userId) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'You cannot delete your own account.' }) }
    }

    // Delete from Supabase Auth (cascades to user_roles via FK if configured)
    const { error: delErr } = await supabase.auth.admin.deleteUser(userId)
    if (delErr) {
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: delErr.message }) }
    }

    // Explicitly clean up in case FK cascade isn't set
    await supabase.from('user_roles').delete().eq('user_id', userId)
    await supabase.from('role_invitations').delete().eq('user_id', userId)

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true }) }
  }

  return {
    statusCode: 405,
    headers:    jsonHeaders,
    body:       JSON.stringify({ error: 'Method not allowed' }),
  }
}
