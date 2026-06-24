/**
 * netlify/functions/lib/stripe.ts
 *
 * Shared Stripe initialisation helper for all Netlify functions.
 *
 *   • Loads secret keys from Netlify env vars (NEVER from the DB).
 *   • Detects which mode to use:
 *       1. STRIPE_MODE env var    (explicit override — currently unset)
 *       2. Admin DB override      (payment_settings.mode_override = 'test' | 'live')
 *       3. Host header            (matches PRODUCTION_HOSTS env var → live, else test)
 *   • Exposes the matching publishable key + webhook secret.
 *
 * Current setup (PRODUCTION LIVE):
 *   limerickhindutemple.netlify.app is the PREVIEW/test site — always test mode.
 *   www.hindutemple.ie is the PRODUCTION site — LIVE MODE ACTIVE ✅
 *   PRODUCTION_HOSTS=www.hindutemple.ie triggers live Stripe keys.
 *
 * Required Netlify env vars (all currently set):
 *   TEST MODE:
 *     STRIPE_SECRET_KEY_TEST          — sk_test_...  (sandbox)
 *     STRIPE_PUBLISHABLE_KEY_TEST     — pk_test_...  (sandbox)
 *     STRIPE_WEBHOOK_SECRET_TEST      — whsec_...    (test webhook endpoint)
 *
 *   LIVE MODE (ACTIVE):
 *     STRIPE_SECRET_KEY_LIVE          — sk_live_...  ✅
 *     STRIPE_PUBLISHABLE_KEY_LIVE     — pk_live_...  ✅
 *     STRIPE_WEBHOOK_SECRET_LIVE      — whsec_...    ✅
 *
 * Optional:
 *   STRIPE_MODE                     — 'test' | 'live'  (force mode; unset for host detection)
 *   PRODUCTION_HOSTS                — comma-separated hostnames that trigger live mode
 *                                     Currently: www.hindutemple.ie
 *                                     e.g. www.hindutemple.ie
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — required to read DB mode_override.
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

export type StripeMode = 'test' | 'live'

export interface ResolvedStripeContext {
  mode:             StripeMode
  publishableKey:   string
  webhookSecret:    string
  stripe:           Stripe
  source:           'db-override' | 'env-override' | 'host'
}

// Known hosts:
//   SANDBOX  — limerickhindutemple.netlify.app  (STRIPE_MODE=test in netlify.toml)
//   PRODUCTION — hindutemple.ie, www.hindutemple.ie  (live mode, real charges)
// The sandbox site is protected by the STRIPE_MODE=test env override, so it
// will never go live even if it somehow appears in PRODUCTION_HOSTS.
const DEFAULT_PRODUCTION_HOSTS: string[] = ['hindutemple.ie', 'www.hindutemple.ie']

function productionHosts(): string[] {
  const raw = process.env.PRODUCTION_HOSTS ?? ''
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return fromEnv.length > 0 ? fromEnv : DEFAULT_PRODUCTION_HOSTS
}

function modeFromHost(host: string | undefined | null): StripeMode {
  if (!host) return 'test'
  const h = host.toLowerCase().split(':')[0]
  return productionHosts().includes(h) ? 'live' : 'test'
}

async function modeFromDb(): Promise<StripeMode | null> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws as unknown as never },
    })
    const { data } = await supabase
      .from('payment_settings')
      .select('mode_override')
      .eq('id', 1)
      .maybeSingle()
    const v = (data as { mode_override?: string } | null)?.mode_override
    if (v === 'test' || v === 'live') return v
    return null
  } catch (err) {
    console.warn('[stripe] Could not read payment_settings:', (err as Error).message)
    return null
  }
}

/**
 * Resolve the active Stripe context for a request.
 *
 * Pass the request's Host header so host-based detection works correctly.
 * Pass `skipDb=true` for the webhook handler (which must use a stable mode
 * derived from the configured webhook secret, not a runtime override).
 */
export async function resolveStripe(opts: {
  host?:    string | null
  skipDb?:  boolean
} = {}): Promise<ResolvedStripeContext> {
  let mode: StripeMode
  let source: ResolvedStripeContext['source']

  const envOverride = process.env.STRIPE_MODE
  const dbOverride  = opts.skipDb ? null : await modeFromDb()

  if (envOverride === 'test' || envOverride === 'live') {
    mode = envOverride
    source = 'env-override'
  } else if (dbOverride) {
    mode = dbOverride
    source = 'db-override'
  } else {
    mode = modeFromHost(opts.host)
    source = 'host'
  }

  const secretKey =
    mode === 'live'
      ? process.env.STRIPE_SECRET_KEY_LIVE
      : process.env.STRIPE_SECRET_KEY_TEST

  const publishableKey =
    mode === 'live'
      ? process.env.STRIPE_PUBLISHABLE_KEY_LIVE
      : process.env.STRIPE_PUBLISHABLE_KEY_TEST

  const webhookSecret =
    mode === 'live'
      ? process.env.STRIPE_WEBHOOK_SECRET_LIVE
      : process.env.STRIPE_WEBHOOK_SECRET_TEST

  if (!secretKey) {
    throw new Error(
      `Stripe ${mode} secret key is not configured (set STRIPE_SECRET_KEY_${mode.toUpperCase()})`,
    )
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    appInfo: {
      name: 'Hindu Association of Ireland',
      version: '1.0.0',
    },
  })

  return {
    mode,
    publishableKey: publishableKey ?? '',
    webhookSecret:  webhookSecret  ?? '',
    stripe,
    source,
  }
}

/**
 * Create a Supabase service-role client (bypasses RLS).
 * Used by all Stripe Netlify functions to persist payment state.
 */
export function supabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as never },
  })
}

/**
 * Standard CORS + JSON headers for all Stripe endpoints.
 */
export const jsonHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type':                 'application/json',
}
