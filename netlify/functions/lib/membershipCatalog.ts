/**
 * netlify/functions/lib/membershipCatalog.ts
 *
 * Server-side membership plan catalog mapping.
 * Duplicates src/data/stripeCatalogMapping.ts for use in Netlify functions.
 * 
 * This defines the 5 membership plans and their Stripe product/price IDs.
 */

export interface MembershipPlanCatalog {
  id: string
  name: string
  price_eur: number
  duration_months: number
  cadence: string
  stripe_price_id_test: string | null
  stripe_price_id_live: string | null
}

/**
 * Membership plan catalog — used by create-checkout-session to resolve
 * plan metadata and Stripe price IDs.
 */
export const MEMBERSHIP_PLANS: MembershipPlanCatalog[] = [
  {
    id: 'annual',
    name: 'Annual Membership',
    price_eur: 20.00,
    duration_months: 12,
    cadence: 'annual',
    stripe_price_id_test: null, // TODO: Set from Stripe Dashboard
    stripe_price_id_live: null, // TODO: Set from Stripe Dashboard
  },
  {
    id: 'shraddha',
    name: 'Shraddha',
    price_eur: 22.00,
    duration_months: 1,
    cadence: 'monthly',
    stripe_price_id_test: null,
    stripe_price_id_live: null,
  },
  {
    id: 'seva',
    name: 'Seva',
    price_eur: 50.00,
    duration_months: 1,
    cadence: 'monthly',
    stripe_price_id_test: null,
    stripe_price_id_live: null,
  },
  {
    id: 'bhakti',
    name: 'Bhakti',
    price_eur: 108.00,
    duration_months: 1,
    cadence: 'monthly',
    stripe_price_id_test: null,
    stripe_price_id_live: null,
  },
  {
    id: 'custom',
    name: 'Custom Amount',
    price_eur: 0, // User-specified
    duration_months: 1,
    cadence: 'monthly',
    stripe_price_id_test: null,
    stripe_price_id_live: null,
  },
]

export function getPlanById(id: string): MembershipPlanCatalog | undefined {
  return MEMBERSHIP_PLANS.find((p) => p.id === id)
}

export function getStripePriceId(
  planId: string,
  mode: 'test' | 'live',
): string | null {
  const plan = getPlanById(planId)
  if (!plan) return null
  return mode === 'live' ? plan.stripe_price_id_live : plan.stripe_price_id_test
}
