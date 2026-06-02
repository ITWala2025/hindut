/**
 * sync-plans-from-mappings.ts
 *
 * Admin endpoint to sync membership_plans from stripe_product_mappings.
 * Updates the database based on active Stripe product mappings for membership entities.
 *
 * POST /.netlify/functions/sync-plans-from-mappings
 * Authorization: Bearer <supabase-access-token>
 *
 * Response:
 *   {
 *     mode: 'test' | 'live',
 *     synced: number,
 *     deactivated: number
 *   }
 */

import type { Handler } from '@netlify/functions'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'

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

    // Fetch all membership mappings for current mode
    const { data: mappings, error: mappingsError } = await supabase
      .from('stripe_product_mappings')
      .select('*')
      .eq('stripe_mode', ctx.mode)
      .eq('entity_type', 'membership')
      .eq('is_active', true)

    if (mappingsError) {
      console.error('[sync-plans] Error fetching mappings:', mappingsError)
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Failed to fetch mappings' }),
      }
    }

    let synced = 0
    let deactivated = 0

    // Upsert plans from mappings
    for (const mapping of mappings || []) {
      const priceMonthly = mapping.price_amount ? mapping.price_amount / 100 : 0
      const durationMonths = mapping.price_interval === 'year' ? 12 : 
                            mapping.price_interval === 'month' ? 1 : 1

      const { error: upsertError } = await supabase
        .from('membership_plans')
        .upsert({
          id: mapping.entity_id,
          name: mapping.product_name,
          duration_label: mapping.price_interval === 'year' ? '1 year' : '1 month',
          duration_months: durationMonths,
          price_eur: priceMonthly,
          description: `Membership plan from Stripe catalog`,
          benefits: ['Community access', 'Event invitations', 'Member benefits'],
          popular: false,
          sort_order: 10,
        }, {
          onConflict: 'id'
        })

      if (upsertError) {
        console.error('[sync-plans] Error upserting plan:', upsertError)
      } else {
        synced++
      }
    }

    // TODO: Mark plans as inactive if they're no longer mapped
    // (This would require adding an 'active' column to membership_plans table)

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        mode: ctx.mode,
        synced,
        deactivated,
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
