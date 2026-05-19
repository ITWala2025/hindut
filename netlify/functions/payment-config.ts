/**
 * netlify/functions/payment-config.ts
 *
 * Public GET endpoint. Returns the active Stripe mode and the matching
 * publishable key so the browser can initialise the client SDK with the
 * correct keys for the current environment.
 *
 *   Response: {
 *     mode:           'test' | 'live',
 *     publishableKey: string,
 *     source:         'db-override' | 'env-override' | 'host'
 *   }
 *
 *   Never returns a secret key.
 */

import type { Handler } from '@netlify/functions'
import { resolveStripe, jsonHeaders } from './lib/stripe.js'

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: jsonHeaders, body: '' }
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const host = event.headers.host ?? event.headers.Host ?? null
    const ctx  = await resolveStripe({ host })

    if (!ctx.publishableKey) {
      console.error('[payment-config] Publishable key missing for mode:', ctx.mode)
      return {
        statusCode: 500,
        headers:    jsonHeaders,
        body:       JSON.stringify({ error: `Stripe ${ctx.mode} publishable key not configured` }),
      }
    }

    return {
      statusCode: 200,
      headers:    { ...jsonHeaders, 'Cache-Control': 'no-store' },
      body:       JSON.stringify({
        mode:           ctx.mode,
        publishableKey: ctx.publishableKey,
        source:         ctx.source,
      }),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[payment-config] Error:', message)
    return {
      statusCode: 500,
      headers:    jsonHeaders,
      body:       JSON.stringify({ error: 'Failed to load payment configuration' }),
    }
  }
}
