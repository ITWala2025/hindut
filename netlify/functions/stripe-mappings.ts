/**
 * stripe-mappings.ts
 *
 * Manages Stripe product/price mappings for memberships, donations, special causes, and tickets.
 * 
 * GET    - Fetch all Stripe products with existing mappings
 * POST   - Create a new mapping
 * PUT    - Update an existing mapping
 * DELETE - Remove a mapping
 */

import type { Handler, HandlerEvent } from '@netlify/functions'
import Stripe from 'stripe'
import { resolveStripe, supabaseAdmin, jsonHeaders } from './lib/stripe.js'

type PermAction = 'view' | 'create' | 'update' | 'delete'

type AuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; status: 401 | 403; reason: string }

/**
 * Authenticate and check if user has required role
 */
async function requireRole(
  authHeader: string | undefined,
  allowedRoles: string[],
): Promise<AuthResult> {
  if (!authHeader) return { ok: false, status: 401, reason: 'No Authorization header' }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { ok: false, status: 401, reason: 'Empty bearer token' }

  const supabase = supabaseAdmin()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    console.error('[requireRole] auth.getUser failed:', userErr?.message ?? 'no user')
    return { ok: false, status: 401, reason: userErr?.message ?? 'Token validation failed' }
  }

  const { data: roleRow, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (roleErr) {
    console.error('[requireRole] user_roles query error:', roleErr.message)
  }

  const role: string | undefined =
    (!roleErr && (roleRow as { role?: string } | null)?.role) ||
    (userData.user.app_metadata?.role as string | undefined)
  if (!role) {
    return { ok: false, status: 403, reason: `No role found for user ${userData.user.id}` }
  }

  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, reason: `Role '${role}' not authorized. Required: ${allowedRoles.join(' or ')}` }
  }

  return { ok: true, userId: userData.user.id, role }
}

interface StripeProductWithPrices {
  id: string
  name: string
  description: string | null
  active: boolean
  metadata: Record<string, string>
  created: number
  prices: Array<{
    id: string
    nickname: string | null
    currency: string
    unit_amount: number | null
    type: 'one_time' | 'recurring'
    recurring: { interval: string; interval_count: number } | null
    active: boolean
  }>
}

interface Mapping {
  id: string
  stripe_product_id: string
  stripe_price_id: string
  stripe_mode: 'test' | 'live'
  entity_type: 'membership' | 'donation' | 'special_cause' | 'ticket'
  entity_id: string
  product_name: string
  price_amount: number | null
  price_currency: string
  price_interval: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Fetch all Stripe products and prices for the current mode
 * 
 * IMPORTANT: This fetches ONLY from Stripe's product catalog via API.
 * It does NOT include local config files (e.g., stripeCatalogMapping.ts).
 * This ensures admins see the true source of truth from Stripe.
 */
async function fetchStripeProducts(stripe: Stripe): Promise<StripeProductWithPrices[]> {
  const products: StripeProductWithPrices[] = []
  
  // Fetch all active products from Stripe (not from local config)
  const productsIterator = stripe.products.list({ limit: 100, active: true })
  
  for await (const product of productsIterator.autoPagingIter()) {
    // Fetch all prices for this product from Stripe
    const pricesIterator = stripe.prices.list({ 
      product: product.id,
      limit: 100,
    })
    
    const prices = []
    for await (const price of pricesIterator.autoPagingIter()) {
      prices.push({
        id: price.id,
        nickname: price.nickname,
        currency: price.currency,
        unit_amount: price.unit_amount,
        type: price.type,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          interval_count: price.recurring.interval_count,
        } : null,
        active: price.active,
      })
    }
    
    products.push({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
      created: product.created,
      prices,
    })
  }
  
  return products
}

/**
 * GET - Fetch all Stripe products with existing mappings
 */
async function handleGet(event: HandlerEvent) {
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

  const host = event.headers.host ?? event.headers.Host ?? null
  const ctx = await resolveStripe(host)
  const supabase = supabaseAdmin()
  
  // Fetch Stripe products
  const products = await fetchStripeProducts(ctx.stripe)
  
  // Fetch existing mappings for this mode
  const { data: mappings, error: mappingsError } = await supabase
    .from('stripe_product_mappings')
    .select('*')
    .eq('stripe_mode', ctx.mode)
    .order('created_at', { ascending: false })
  
  if (mappingsError) {
    console.error('[stripe-mappings] Error fetching mappings:', mappingsError)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to fetch mappings' }),
    }
  }
  
  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({
      mode: ctx.mode,
      products,
      mappings: mappings || [],
    }),
  }
}

/**
 * POST - Create a new mapping
 */
async function handlePost(event: HandlerEvent) {
  const auth = await requireRole(
    event.headers.authorization ?? event.headers.Authorization,
    ['super_admin']
  )
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: jsonHeaders,
      body: JSON.stringify({ error: auth.reason }),
    }
  }

  const supabase = supabaseAdmin()
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Request body required' }),
    }
  }
  
  const body = JSON.parse(event.body)
  const {
    stripe_product_id,
    stripe_price_id,
    stripe_mode,
    entity_type,
    entity_id,
    product_name,
    price_amount,
    price_currency,
    price_interval,
  } = body
  
  // Validate required fields
  if (!stripe_product_id || !stripe_price_id || !stripe_mode || !entity_type || !entity_id) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Missing required fields' }),
    }
  }
  
  // Check if mapping already exists for this price ID and mode
  const { data: existing } = await supabase
    .from('stripe_product_mappings')
    .select('id')
    .eq('stripe_price_id', stripe_price_id)
    .eq('stripe_mode', stripe_mode)
    .maybeSingle()
  
  if (existing) {
    return {
      statusCode: 409,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Mapping already exists for this Stripe price ID' }),
    }
  }
  
  // Create mapping
  const { data: mapping, error } = await supabase
    .from('stripe_product_mappings')
    .insert({
      stripe_product_id,
      stripe_price_id,
      stripe_mode,
      entity_type,
      entity_id,
      product_name: product_name || 'Unnamed',
      price_amount,
      price_currency: price_currency || 'eur',
      price_interval,
      is_active: true,
      created_by: auth.userId,
      updated_by: auth.userI
      stripe_product_id,
      stripe_price_id,
      stripe_mode,
      entity_type,
      entity_id,
      product_name: product_name || 'Unnamed',
      price_amount,
      price_currency: price_currency || 'eur',
      price_interval,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    })auth = await requireRole(
    event.headers.authorization ?? event.headers.Authorization,
    ['super_admin']
  )
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: jsonHeaders,
      body: JSON.stringify({ error: auth.reason }),
    }
  }

  const supabase = supabaseAdmin()
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Request body required' }),
    }
  }
  
  const body = JSON.parse(event.body)
  const { id, entity_type, entity_id, is_active } = body
  
  if (!id) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Mapping ID required' }),
    }
  }
  
  const updates: any = {
    updated_by: auth.userI
async function handlePut(event: HandlerEvent) {
  const { user } = await requireAuth(event, supabase, ['super_admin'])
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Request body required' }),
    }
  }
  
  const body = JSON.parse(event.body)
  const { id, entity_type, entity_id, is_active } = body
  
  if (!id) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Mapping ID required' }),
    }
  }
  
  const auth = await requireRole(
    event.headers.authorization ?? event.headers.Authorization,
    ['super_admin']
  )
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: jsonHeaders,
      body: JSON.stringify({ error: auth.reason }),
    }
  }

  const supabase = supabaseAdmin(
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }
  
  if (entity_type !== undefined) updates.entity_type = entity_type
  if (entity_id !== undefined) updates.entity_id = entity_id
  if (is_active !== undefined) updates.is_active = is_active
  
  const { data: mapping, error } = await supabase
    .from('stripe_product_mappings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('[stripe-mappings] Error updating mapping:', error)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to update mapping' }),
    }
  }
  
  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({ mapping }),
  }
}

/**
 * DELETE - Remove a mapping
 */
async function handleDelete(event: HandlerEvent) {
  const { user } = await requireAuth(event, supabase, ['super_admin'])
  
  const id = event.queryStringParameters?.id
  
  if (!id) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Mapping ID required' }),
    }
  }
  
  const { error } = await supabase
    .from('stripe_product_mappings')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('[stripe-mappings] Error deleting mapping:', error)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Failed to delete mapping' }),
    }
  }
  
  return {
    statusCode: 200,
    headers: jsonHeaders,
    body: JSON.stringify({ success: true }),
  }
}

export const handler: Handler = async (event) => {
  try {
    switch (event.httpMethod) {
      case 'GET':
        return await handleGet(event)
      case 'POST':
        return await handlePost(event)
      case 'PUT':
        return await handlePut(event)
      case 'DELETE':
        return await handleDelete(event)
      default:
        return {
          statusCode: 405,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'Method not allowed' }),
        }
    }
  } catch (err) {
    console.error('[stripe-mappings] Error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: message }),
    }
  }
}
