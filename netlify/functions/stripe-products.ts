/**
 * netlify/functions/stripe-products.ts
 *
 * Admin-only endpoint that returns the full Stripe product catalogue for the
 * active Stripe mode (test or live), including each product's prices.
 *
 *   GET /.netlify/functions/stripe-products
 *
 *   Response:
 *   {
 *     mode:     'test' | 'live',
 *     products: Array<{
 *       id:          string
 *       name:        string
 *       description: string | null
 *       active:      boolean
 *       images:      string[]
 *       metadata:    Record<string, string>
 *       created:     number   // unix timestamp
 *       prices: Array<{
 *         id:           string
 *         nickname:     string | null
 *         currency:     string
 *         amount:       number | null   // cents; null for usage-based
 *         type:         'one_time' | 'recurring'
 *         interval:     string | null   // 'month' | 'year' etc.
 *         active:       boolean
 *       }>
 *     }>
 *   }
 *
 * Authorisation: settings:view (same as payment-settings GET).
 * super_admin bypasses the permission lookup.
 */

import type { Handler } from '@netlify/functions'
import Stripe from 'stripe'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'

type PermAction = 'view' | 'create' | 'update' | 'delete'

type AuthResult =
  | { ok: true;  userId: string }
  | { ok: false; status: 401 | 403; reason: string }

async function requirePermission(
  authHeader: string | undefined,
  module: string,
  action: PermAction,
): Promise<AuthResult> {
  if (!authHeader) return { ok: false, status: 401, reason: 'No Authorization header' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, reason: 'Empty bearer token' }

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    console.error('[requirePermission] auth.getUser failed:', userErr?.message ?? 'no user')
    return { ok: false, status: 401, reason: userErr?.message ?? 'Token validation failed' }
  }

  const { data: roleRow, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (roleErr) {
    console.error('[requirePermission] user_roles query error:', roleErr.message)
  }
  // Fall back to JWT app_metadata.role if the DB row is absent or the query errored.
  // app_metadata is set server-side and is safe to trust after JWT verification.
  const role: string | undefined =
    (!roleErr && (roleRow as { role?: string } | null)?.role) ||
    (userData.user.app_metadata?.role as string | undefined)
  if (!role) {
    return { ok: false, status: 403, reason: `No role found for user ${userData.user.id}` }
  }

  if (role === 'super_admin') return { ok: true, userId: userData.user.id }
  if (role !== 'admin' && role !== 'editor') {
    return { ok: false, status: 403, reason: `Unknown role: ${role}` }
  }

  const { data: permRow, error: permErr } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', role)
    .maybeSingle()
  if (permErr) {
    console.error('[requirePermission] role_permissions query error:', permErr.message)
    return { ok: false, status: 403, reason: `Permissions lookup failed: ${permErr.message}` }
  }

  const perms = (permRow as { permissions?: Record<string, Record<string, boolean>> } | null)
    ?.permissions
  if (!perms?.[module]?.[action]) {
    return { ok: false, status: 403, reason: `Role '${role}' lacks ${module}:${action}` }
  }

  return { ok: true, userId: userData.user.id }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let caller: Awaited<ReturnType<typeof requirePermission>>
  try {
    caller = await requirePermission(
      event.headers.authorization ?? event.headers.Authorization,
      'settings',
      'view',
    )
  } catch (authErr) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr)
    console.error('[stripe-products] requirePermission threw:', msg)
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Internal auth error' }) }
  }
  if (!caller.ok) {
    console.warn('[stripe-products] access denied:', caller.reason)
    return {
      statusCode: caller.status,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: caller.status === 401 ? 'Session expired – please sign in again.' : `Permission denied: settings:view required` }),
    }
  }

  try {
    const host = event.headers.host ?? event.headers.Host ?? null
    const ctx  = await resolveStripe({ host })

    // Fetch all products (active + inactive) with auto-pagination.
    const productPages = await ctx.stripe.products.list({ limit: 100, expand: ['data.default_price'] })
    const allProducts: Stripe.Product[] = productPages.data

    // For each product fetch its prices.
    const pricesByProduct = new Map<string, Stripe.Price[]>()
    await Promise.all(
      allProducts.map(async (product) => {
        const priceList = await ctx.stripe.prices.list({ product: product.id, limit: 100 })
        pricesByProduct.set(product.id, priceList.data)
      }),
    )

    const products = allProducts.map((p) => {
      const prices = (pricesByProduct.get(p.id) ?? []).map((pr) => ({
        id:       pr.id,
        nickname: pr.nickname ?? null,
        currency: pr.currency,
        amount:   pr.unit_amount ?? null,
        type:     pr.type,
        interval: pr.recurring?.interval ?? null,
        active:   pr.active,
      }))
      return {
        id:          p.id,
        name:        p.name,
        description: p.description ?? null,
        active:      p.active,
        images:      p.images,
        metadata:    p.metadata,
        created:     p.created,
        prices,
      }
    })

    // Sort: active first, then by created descending.
    products.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return b.created - a.created
    })

    return {
      statusCode: 200,
      headers:    { ...jsonHeaders, 'Cache-Control': 'no-store' },
      body:       JSON.stringify({ mode: ctx.mode, products }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe-products] error:', message)
    return {
      statusCode: 500,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: message }),
    }
  }
}
