/**
 * sync-plans-from-mappings.ts
 *
 * Admin endpoint to sync all membership and giving plans from stripeCatalogMapping
 * to the database. This ensures the database is the single source of truth for the frontend.
 *
 * POST /.netlify/functions/sync-plans-from-mappings
 * Authorization: Bearer <supabase-access-token>
 *
 * Response:
 *   {
 *     mode: 'test' | 'live',
 *     synced: number
 *   }
 */

import type { Handler } from '@netlify/functions'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'
import { MEMBERSHIP_CATALOG } from './lib/membershipCatalog.js'

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; reason: string }

async function requireRole(
  authHeader: string | undefined,
  allowedRoles: string[],
): Promise<AuthResult> {
  if (!authHeader) return { ok: false, status: 401, reason: 'No Authorization header' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, reason: 'Empty bearer token' }

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) {
    return { ok: false, status: 401, reason: 'Invalid token' }
  }

  const userId = userData.user.id

  // Check role in public.user_roles table
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  const role = roleData?.role ?? userData.user.app_metadata?.role ?? 'viewer'

  if (role === 'super_admin' || allowedRoles.includes(role)) {
    return { ok: true, userId }
  }

  return { ok: false, status: 403, reason: 'Insufficient permissions' }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const auth = await requireRole(
    event.headers.authorization ?? event.headers.Authorization,
    ['super_admin', 'admin']
  )

  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: jsonHeaders,
      body: JSON.stringify({ error: auth.reason }),
    }
  }

  try {
    const host = event.headers.host ?? event.headers.Host ?? null
    const ctx = await resolveStripe({ host })
    const supabase = supabaseAdmin()

    let synced = 0

    // Sync all plans from MEMBERSHIP_CATALOG to database
    for (const catalogPlan of MEMBERSHIP_CATALOG) {
      const { error: upsertError } = await supabase
        .from('membership_plans')
        .upsert({
          id: catalogPlan.id,
          name: catalogPlan.name,
          duration_label: catalogPlan.durationLabel,
          duration_months: catalogPlan.durationMonths,
          price_eur: catalogPlan.price,
          description: catalogPlan.description,
          benefits: catalogPlan.benefits,
          popular: catalogPlan.popular,
          sort_order: catalogPlan.sortOrder,
          subtitle: catalogPlan.subtitle || null,
          icon: catalogPlan.icon || null,
          gradient: catalogPlan.gradient || null,
          bg_gradient: catalogPlan.bgGradient || null,
          border_color: catalogPlan.borderColor || null,
          category: catalogPlan.category,
          cadence: catalogPlan.cadence,
          active: catalogPlan.active,
        }, {
          onConflict: 'id'
        })

      if (upsertError) {
        console.error('[sync-plans] Error upserting plan:', catalogPlan.id, upsertError)
      } else {
        synced++
      }
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        mode: ctx.mode,
        synced,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sync-plans] fatal error:', message)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message }),
    }
  }
}
