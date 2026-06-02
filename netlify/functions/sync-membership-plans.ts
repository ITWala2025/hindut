/**
 * netlify/functions/sync-membership-plans.ts
 *
 * Admin-only endpoint that syncs membership_plans to the Stripe product
 * catalogue for the active mode (test or live).
 *
 *   POST /.netlify/functions/sync-membership-plans
 *   Authorization: Bearer <supabase-access-token>
 *
 * For each active membership plan the function:
 *   1. Searches for an existing Stripe Product tagged with
 *      metadata.plan_id = plan.id  (idempotent).
 *   2. Creates the Product if not found (or updates name/description).
 *   3. Finds or creates a recurring Price for the product that matches
 *      the plan's amount, currency and billing interval.
 *   4. Writes stripe_product_id_{mode} and stripe_price_id_{mode} back
 *      into public.membership_plans so create-checkout-session can use
 *      { price: priceId, quantity: 1 } instead of inline price_data.
 *
 * Response:
 *   {
 *     mode:   'test' | 'live',
 *     synced: [{ planId, productId, priceId, action: 'created'|'updated'|'reused' }],
 *     errors: [{ planId, message }]
 *   }
 *
 * Authorisation: settings:update (same scope as payment-settings PUT).
 * super_admin always passes.
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
    return { ok: false, status: 401, reason: userErr?.message ?? 'Token validation failed' }
  }

  const { data: roleRow, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const role: string | undefined =
    (!roleErr && (roleRow as { role?: string } | null)?.role) ||
    (userData.user.app_metadata?.role as string | undefined)

  if (!role) return { ok: false, status: 403, reason: `No role found for user ${userData.user.id}` }
  if (role === 'super_admin') return { ok: true, userId: userData.user.id }
  if (role !== 'admin' && role !== 'editor') {
    return { ok: false, status: 403, reason: `Unknown role: ${role}` }
  }

  const { data: permRow, error: permErr } = await supabase
    .from('role_permissions')
    .select('permissions')
    .eq('role', role)
    .maybeSingle()
  if (permErr) return { ok: false, status: 403, reason: `Permissions lookup failed: ${permErr.message}` }

  const perms = (permRow as { permissions?: Record<string, Record<string, boolean>> } | null)?.permissions
  if (!perms?.[module]?.[action]) {
    return { ok: false, status: 403, reason: `Role '${role}' lacks ${module}:${action}` }
  }
  return { ok: true, userId: userData.user.id }
}

// Map plan cadence → Stripe billing interval
function cadenceToInterval(
  cadence: string | null | undefined,
  durationMonths: number,
): { interval: 'month' | 'year'; interval_count: number } {
  switch (cadence) {
    case 'annual':      return { interval: 'year',  interval_count: 1 }
    case 'semi_annual': return { interval: 'month', interval_count: 6 }
    case 'monthly':     return { interval: 'month', interval_count: 1 }
    default: {
      if (durationMonths >= 12) return { interval: 'year',  interval_count: Math.max(1, Math.round(durationMonths / 12)) }
      return { interval: 'month', interval_count: Math.max(1, durationMonths) }
    }
  }
}

interface PlanRow {
  id: string
  name: string
  description: string | null
  price_eur: number | string
  cadence: string | null
  duration_months: number
  active: boolean | null
  stripe_product_id_test: string | null
  stripe_price_id_test: string | null
  stripe_product_id_live: string | null
  stripe_price_id_live: string | null
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const caller = await requirePermission(
    event.headers.authorization ?? event.headers.Authorization,
    'settings',
    'update',
  )
  if (!caller.ok) {
    return {
      statusCode: caller.status,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: caller.status === 401 ? 'Session expired – please sign in again.' : 'Permission denied: settings:update required' }),
    }
  }

  try {
    const host = event.headers.host ?? event.headers.Host ?? null
    const ctx  = await resolveStripe({ host })
    const supabase = supabaseAdmin()

    // Fetch all active membership plans
    const { data: planRows, error: plansErr } = await supabase
      .from('membership_plans')
      .select('id, name, description, price_eur, cadence, duration_months, active, stripe_product_id_test, stripe_price_id_test, stripe_product_id_live, stripe_price_id_live')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (plansErr) {
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: plansErr.message }) }
    }

    const plans = (planRows ?? []) as PlanRow[]
    const productIdCol = ctx.mode === 'live' ? 'stripe_product_id_live' : 'stripe_product_id_test'
    const priceIdCol   = ctx.mode === 'live' ? 'stripe_price_id_live'   : 'stripe_price_id_test'

    const synced: { planId: string; productId: string; priceId: string; action: string }[] = []
    const errors: { planId: string; message: string }[] = []

    for (const plan of plans) {
      try {
        const amountCents = Math.round(Number(plan.price_eur) * 100)
        const billing     = cadenceToInterval(plan.cadence, plan.duration_months)

        // ── 1. Find or create Stripe Product ────────────────────────────────
        let productId: string | null = plan[productIdCol] as string | null
        let productAction = 'reused'

        if (productId) {
          // Verify it still exists in Stripe; update name/description if stale.
          try {
            const existing = await ctx.stripe.products.retrieve(productId)
            if (existing.name !== plan.name || existing.description !== (plan.description ?? null)) {
              await ctx.stripe.products.update(productId, {
                name:        plan.name,
                description: plan.description ?? undefined,
              })
              productAction = 'updated'
            }
          } catch {
            // Product was deleted from Stripe; clear stored ID and recreate below.
            productId     = null
            productAction = 'created'
          }
        }

        if (!productId) {
          // Search by metadata.plan_id in case a product was created earlier
          // but the DB column was not written (e.g. a prior failed sync).
          const search = await ctx.stripe.products.search({
            query:  `metadata['plan_id']:'${plan.id}' AND metadata['source']:'hai'`,
            limit:  1,
          })
          if (search.data.length > 0) {
            productId     = search.data[0].id
            productAction = 'reused'
            // Sync name/description if they drifted
            const p = search.data[0]
            if (p.name !== plan.name || p.description !== (plan.description ?? null)) {
              await ctx.stripe.products.update(productId, {
                name:        plan.name,
                description: plan.description ?? undefined,
              })
              productAction = 'updated'
            }
          } else {
            // Create brand-new product
            const created = await ctx.stripe.products.create({
              name:        plan.name,
              description: plan.description ?? undefined,
              metadata: {
                plan_id: plan.id,
                source:  'hai',
                mode:    ctx.mode,
              },
            })
            productId     = created.id
            productAction = 'created'
          }
        }

        // ── 2. Find or create Stripe Price ───────────────────────────────────
        let priceId: string | null = plan[priceIdCol] as string | null
        let priceAction = 'reused'

        if (priceId) {
          // Verify price still exists and matches; Stripe prices are immutable
          // so if amount/interval changed we must create a new one.
          try {
            const existing = await ctx.stripe.prices.retrieve(priceId)
            const intervalMatch =
              existing.recurring?.interval       === billing.interval &&
              existing.recurring?.interval_count === billing.interval_count
            const amountMatch = existing.unit_amount === amountCents

            if (!amountMatch || !intervalMatch || !existing.active) {
              // Mismatch or archived — create a new price below
              priceId     = null
              priceAction = 'created'
            }
          } catch {
            priceId     = null
            priceAction = 'created'
          }
        }

        if (!priceId) {
          // Look for an existing active price with matching amount + interval
          const priceList = await ctx.stripe.prices.list({
            product:  productId!,
            active:   true,
            type:     'recurring',
            limit:    100,
          })

          const match = priceList.data.find(
            (pr) =>
              pr.unit_amount           === amountCents          &&
              pr.currency              === 'eur'                &&
              pr.recurring?.interval   === billing.interval     &&
              pr.recurring?.interval_count === billing.interval_count,
          )

          if (match) {
            priceId     = match.id
            priceAction = priceAction === 'created' ? 'created' : 'reused'
          } else {
            const created = await ctx.stripe.prices.create({
              product:    productId!,
              currency:   'eur',
              unit_amount: amountCents,
              recurring: {
                interval:       billing.interval,
                interval_count: billing.interval_count,
              },
              nickname: `${plan.name} – ${ctx.mode}`,
              metadata: {
                plan_id: plan.id,
                source:  'hai',
                mode:    ctx.mode,
              },
            })
            priceId     = created.id
            priceAction = 'created'
          }
        }

        // ── 3. Persist IDs back to membership_plans ─────────────────────────
        const { error: updateErr } = await supabase
          .from('membership_plans')
          .update({
            [productIdCol]: productId,
            [priceIdCol]:   priceId,
          })
          .eq('id', plan.id)

        if (updateErr) {
          console.error('[sync-membership-plans] DB update error for plan', plan.id, ':', updateErr.message)
          errors.push({ planId: plan.id, message: `DB update failed: ${updateErr.message}` })
          continue
        }

        synced.push({
          planId:    plan.id,
          productId: productId!,
          priceId:   priceId!,
          action:    [productAction, priceAction].filter((a) => a !== 'reused').join('+') || 'reused',
        })

        console.log(
          `[sync-membership-plans] plan ${plan.id} → product ${productId} price ${priceId} (${productAction}/${priceAction}) [${ctx.mode}]`,
        )
      } catch (planErr) {
        const msg = planErr instanceof Error ? planErr.message : String(planErr)
        console.error('[sync-membership-plans] error for plan', plan.id, ':', msg)
        errors.push({ planId: plan.id, message: msg })
      }
    }

    return {
      statusCode: 200,
      headers:    { ...jsonHeaders, 'Cache-Control': 'no-store' },
      body:       JSON.stringify({ mode: ctx.mode, synced, errors }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sync-membership-plans] fatal error:', message)
    return {
      statusCode: 500,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: message }),
    }
  }
}
