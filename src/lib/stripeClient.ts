/**
 * src/lib/stripeClient.ts
 *
 * Resolves the active Stripe publishable key from the server (which decides
 * test-vs-live based on host detection + DB override + env override), then
 * memoises a `loadStripe()` promise so all components share one Stripe.js
 * instance.
 *
 *   const stripe = await getStripe()
 *
 * Secret keys never reach the browser; this only fetches the publishable
 * counterpart and the current mode flag (for UI labelling).
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js'

export interface PaymentConfig {
  mode:           'test' | 'live'
  publishableKey: string
  source:         'db-override' | 'env-override' | 'host'
}

let configPromise: Promise<PaymentConfig> | null = null
let stripePromise: Promise<Stripe | null> | null = null

export async function getPaymentConfig(): Promise<PaymentConfig> {
  if (configPromise) return configPromise
  configPromise = fetch('/.netlify/functions/payment-config', { method: 'GET' })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load payment config' }))
        throw new Error(err.error ?? 'Failed to load payment config')
      }
      return res.json() as Promise<PaymentConfig>
    })
    .catch((err) => {
      // Reset so future callers can retry.
      configPromise = null
      throw err
    })
  return configPromise
}

export async function getStripe(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise
  const cfg = await getPaymentConfig()
  stripePromise = loadStripe(cfg.publishableKey)
  return stripePromise
}

/** Reset cached promises (used when admin changes the mode override). */
export function resetStripeCache(): void {
  configPromise = null
  stripePromise = null
}
