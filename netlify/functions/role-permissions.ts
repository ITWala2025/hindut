/**
 * netlify/functions/role-permissions.ts
 *
 * Update the CRUD permission matrix for the 'admin' or 'editor' role.
 *
 * Routes:
 *   PUT  /role-permissions  { target_role: 'admin'|'editor', new_permissions: {...} }
 *
 * Only super_admin may call this endpoint.  The function uses service_role
 * so it bypasses RLS and can upsert directly into role_permissions without
 * needing the public.set_role_permissions() RPC (which is now revoked from
 * the public API schema for security reasons).
 */

import type { Handler } from '@netlify/functions'
import { supabaseAdmin, jsonHeaders } from './lib/stripe.js'

// ---------------------------------------------------------------------------
// Auth helper — super_admin only
// ---------------------------------------------------------------------------
async function requireSuperAdmin(authHeader: string | undefined) {
  if (!authHeader) return { ok: false as const, status: 401 as const, reason: 'No Authorization header' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false as const, status: 401 as const, reason: 'Empty bearer token' }

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    return { ok: false as const, status: 401 as const, reason: userErr?.message ?? 'Token validation failed' }
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const role: string | undefined =
    (roleRow as { role?: string } | null)?.role ||
    (userData.user.app_metadata?.role as string | undefined)

  if (role !== 'super_admin') {
    return { ok: false as const, status: 403 as const, reason: 'Only super_admin can update role permissions' }
  }

  return { ok: true as const, userId: userData.user.id }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const auth = await requireSuperAdmin(event.headers.authorization)
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: jsonHeaders,
      body: JSON.stringify({ error: auth.reason }),
    }
  }

  let body: { target_role?: string; new_permissions?: unknown }
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { target_role, new_permissions } = body

  if (target_role !== 'admin' && target_role !== 'editor') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `Only 'admin' and 'editor' roles are configurable (got '${target_role}')` }),
    }
  }

  if (!new_permissions || typeof new_permissions !== 'object') {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'new_permissions must be an object' }),
    }
  }

  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('role_permissions')
    .upsert(
      {
        role:        target_role,
        permissions: new_permissions,
        updated_at:  new Date().toISOString(),
        updated_by:  auth.userId,
      },
      { onConflict: 'role' },
    )

  if (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: `DB error (${error.code}): ${error.message}` }),
    }
  }

  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({ ok: true }),
  }
}
