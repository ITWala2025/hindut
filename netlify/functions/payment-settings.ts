/**
 * netlify/functions/payment-settings.ts
 *
 * Admin-only endpoint for the "Settings → Payments" page.
 *
 *   GET  → returns:
 *     {
 *       mode:           'test' | 'live',
 *       source:         'db-override' | 'env-override' | 'host',
 *       modeOverride:   'auto' | 'test' | 'live',
 *       productionHosts: string[],
 *       envStatus: {
 *         testSecret:        boolean,
 *         testPublishable:   boolean,
 *         testWebhookSecret: boolean,
 *         liveSecret:        boolean,
 *         livePublishable:   boolean,
 *         liveWebhookSecret: boolean
 *       },
 *       account: { id, displayName, country } | null
 *     }
 *
 *   PUT  → body { modeOverride: 'auto' | 'test' | 'live', notes?: string }
 *     updates `payment_settings` (singleton row id=1).
 *
 * Authorisation:
 *   The browser sends the Supabase access token in the Authorization header.
 *   The function verifies the token and checks `public.role_permissions` for
 *   the caller's role:
 *     GET requires settings:view
 *     PUT requires settings:update
 *   super_admin always passes.
 */

import type { Handler } from '@netlify/functions'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'

type PermAction = 'view' | 'create' | 'update' | 'delete'

async function requirePermission(
  authHeader: string | undefined,
  module: string,
  action: PermAction,
): Promise<{ userId: string } | null> {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) return null

  const { data: roleRow, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  // Fall back to JWT app_metadata.role if the DB row is absent or the query errored.
  // app_metadata is set server-side and is safe to trust after JWT verification.
  const role: string | undefined =
    (!roleErr && (roleRow as { role?: string } | null)?.role) ||
    (userData.user.app_metadata?.role as string | undefined)
  if (!role) return null

  // super_admin always has every permission.
  if (role === 'super_admin') return { userId: userData.user.id }

  if (role !== 'admin' && role !== 'editor') return null

  const { data: permRow, error: permErr } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', role)
    .maybeSingle()
  if (permErr) return null

  const perms = (permRow as { permissions?: Record<string, Record<string, boolean>> } | null)
    ?.permissions
  if (!perms?.[module]?.[action]) return null

  return { userId: userData.user.id }
}

function envStatus() {
  const has = (k: string) => Boolean(process.env[k])
  return {
    testSecret:        has('STRIPE_SECRET_KEY_TEST'),
    testPublishable:   has('STRIPE_PUBLISHABLE_KEY_TEST'),
    testWebhookSecret: has('STRIPE_WEBHOOK_SECRET_TEST'),
    liveSecret:        has('STRIPE_SECRET_KEY_LIVE'),
    livePublishable:   has('STRIPE_PUBLISHABLE_KEY_LIVE'),
    liveWebhookSecret: has('STRIPE_WEBHOOK_SECRET_LIVE'),
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }

  const host = event.headers.host ?? event.headers.Host ?? null
  const supabase = supabaseAdmin()

  const requiredAction: PermAction = event.httpMethod === 'PUT' ? 'update' : 'view'
  const admin = await requirePermission(
    event.headers.authorization ?? event.headers.Authorization,
    'settings',
    requiredAction,
  )
  if (!admin) {
    return {
      statusCode: 403,
      headers:    jsonHeaders,
      body:       JSON.stringify({
        error: `Permission denied: settings:${requiredAction} required`,
      }),
    }
  }

  // -- GET -----------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    try {
      const ctx = await resolveStripe({ host })

      const { data: rowData } = await supabase
        .from('payment_settings')
        .select('mode_override, updated_at, notes')
        .eq('id', 1)
        .maybeSingle()

      // Fetch the Stripe account display info (best-effort, never blocks).
      let account: { id: string; displayName: string | null; country: string | null } | null = null
      try {
        const acct = await ctx.stripe.accounts.retrieve()
        account = {
          id:          acct.id,
          displayName: acct.business_profile?.name ?? acct.settings?.dashboard?.display_name ?? null,
          country:     acct.country ?? null,
        }
      } catch (err) {
        console.warn('[payment-settings] accounts.retrieve failed:', (err as Error).message)
      }

      return {
        statusCode: 200,
        headers:    { ...jsonHeaders, 'Cache-Control': 'no-store' },
        body:       JSON.stringify({
          mode:            ctx.mode,
          source:          ctx.source,
          modeOverride:    (rowData as { mode_override?: string } | null)?.mode_override ?? 'auto',
          updatedAt:       (rowData as { updated_at?: string } | null)?.updated_at ?? null,
          notes:           (rowData as { notes?: string | null } | null)?.notes ?? null,
          productionHosts: (process.env.PRODUCTION_HOSTS ?? 'www.hindutemple.ie')
            .split(',').map((s) => s.trim()).filter(Boolean),
          sandboxHosts:    ['limerickhindutemple.netlify.app'],
          envStatus:       envStatus(),
          account,
        }),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[payment-settings] GET error:', message)
      return {
        statusCode: 500,
        headers:    jsonHeaders,
        body:       JSON.stringify({ error: message }),
      }
    }
  }

  // -- PUT -----------------------------------------------------------------
  if (event.httpMethod === 'PUT') {
    try {
      const body = JSON.parse(event.body ?? '{}') as { modeOverride?: string; notes?: string | null }
      const next = body.modeOverride
      if (next !== 'auto' && next !== 'test' && next !== 'live') {
        return {
          statusCode: 422,
          headers:    jsonHeaders,
          body:       JSON.stringify({ error: 'modeOverride must be auto | test | live' }),
        }
      }

      const { error: upErr } = await supabase
        .from('payment_settings')
        .update({
          mode_override: next,
          notes:         body.notes ?? null,
          updated_at:    new Date().toISOString(),
          updated_by:    admin.userId,
        })
        .eq('id', 1)

      if (upErr) {
        console.error('[payment-settings] update error:', upErr)
        return {
          statusCode: 500,
          headers:    jsonHeaders,
          body:       JSON.stringify({ error: 'Failed to update settings' }),
        }
      }

      return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ success: true }) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[payment-settings] PUT error:', message)
      return {
        statusCode: 500,
        headers:    jsonHeaders,
        body:       JSON.stringify({ error: message }),
      }
    }
  }

  return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
}
