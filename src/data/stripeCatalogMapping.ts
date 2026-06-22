/**
 * stripeCatalogMapping.ts
 *
 * Manual mapping between Stripe product catalog and frontend membership plans.
 * 
 * This file defines the 5 membership plans (1 annual, 3 monthly giving, 1 custom)
 * and their corresponding Stripe product/price IDs for both test and live modes.
 * 
 * TO UPDATE STRIPE IDs:
 * 1. Create products in Stripe Dashboard (test + live)
 * 2. Copy product_xxx and price_xxx IDs here
 * 3. Commit changes — no database sync needed
 */

import type { MembershipPlan, PlanCadence, PlanCategory } from './membership'

export interface StripeCatalogPlan extends Omit<MembershipPlan, 'stripeProductIdTest' | 'stripePriceIdTest' | 'stripeProductIdLive' | 'stripePriceIdLive'> {
  // Stripe catalog IDs (manually maintained)
  stripe: {
    test: {
      productId: string | null
      priceId: string | null
    }
    live: {
      productId: string | null
      priceId: string | null
    }
  }
}

/**
 * Membership plan catalog — source of truth for all plans.
 * Each plan maps to a Stripe product in test + live modes.
 * 
 * IMPORTANT: Update these IDs after creating products in Stripe Dashboard.
 */
export const MEMBERSHIP_CATALOG: StripeCatalogPlan[] = [
  // ────────────────────────────────────────────────────────────────────────
  // Annual Membership
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'annual',
    name: 'Annual Membership',
    durationLabel: 'year',
    durationMonths: 12,
    price: 20.00,
    description: 'A full year of spiritual community membership — directly supporting the Hindu Temple Project in Limerick.',
    benefits: [
      'Monthly Nama-Nakshatra Archana',
      'Annual special-occasion Archana',
      'Karpaga Vriksham leaf entry',
      'Community newsletter & event invitations',
      'Annual report and tax receipt',
    ],
    popular: true,
    sortOrder: 1,
    cadence: 'annual',
    category: 'membership',
    subtitle: 'Core membership',
    icon: 'Crown',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50',
    borderColor: 'border-orange-200',
    active: true,
    stripe: {
      test: {
        // TODO: Replace with actual test mode IDs from Stripe Dashboard
        productId: null,
        priceId: null,
      },
      live: {
        // TODO: Replace with actual live mode IDs from Stripe Dashboard
        productId: null,
        priceId: null,
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Monthly Giving Tiers
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'shraddha',
    name: 'Shraddha',
    durationLabel: 'month',
    durationMonths: 1,
    price: 22.00,
    description: 'Support weekly prayers and monthly community satsang.',
    benefits: [
      'Monthly Nama-Nakshatra Archana',
      'Community newsletter',
      'Satsang invitations',
    ],
    popular: false,
    sortOrder: 10,
    cadence: 'monthly',
    category: 'giving',
    subtitle: 'Faith',
    icon: 'Flame',
    gradient: 'from-orange-500 to-rose-500',
    bgGradient: 'from-orange-50 to-rose-50',
    borderColor: 'border-orange-200',
    active: true,
    stripe: {
      test: {
        productId: null,
        priceId: null,
      },
      live: {
        productId: null,
        priceId: null,
      },
    },
  },

  {
    id: 'seva',
    name: 'Seva',
    durationLabel: 'month',
    durationMonths: 1,
    price: 50.00,
    description: 'Help maintain our community hall and support weekly cultural programs.',
    benefits: [
      'All Shraddha tier benefits',
      'Monthly special puja dedication',
      'Quarterly donor report',
      'Recognition in community newsletter',
    ],
    popular: true,
    sortOrder: 11,
    cadence: 'monthly',
    category: 'giving',
    subtitle: 'Service',
    icon: 'HandCoins',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200',
    active: true,
    stripe: {
      test: {
        productId: null,
        priceId: null,
      },
      live: {
        productId: null,
        priceId: null,
      },
    },
  },

  {
    id: 'bhakti',
    name: 'Bhakti',
    durationLabel: 'month',
    durationMonths: 1,
    price: 100.00,
    description: 'Champion supporter of the Limerick Hindu Temple project.',
    benefits: [
      'All Seva tier benefits',
      'Founding donor recognition plaque',
      'Priority event seating',
      'Invitation to annual donor appreciation dinner',
      'Direct updates from temple committee',
    ],
    popular: false,
    sortOrder: 12,
    cadence: 'monthly',
    category: 'giving',
    subtitle: 'Devotion',
    icon: 'Star',
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-50 to-purple-50',
    borderColor: 'border-violet-200',
    active: true,
    stripe: {
      test: {
        productId: null,
        priceId: null,
      },
      live: {
        productId: null,
        priceId: null,
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // Custom Amount (inline price_data, no catalog entry)
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'custom',
    name: 'Custom Amount',
    durationLabel: 'month',
    durationMonths: 1,
    price: 0, // User-specified
    description: 'Choose your own monthly contribution amount.',
    benefits: [
      'Flexible contribution amount',
      'All standard membership benefits',
      'Monthly tax receipt',
    ],
    popular: false,
    sortOrder: 20,
    cadence: 'monthly',
    category: 'giving',
    subtitle: 'Your choice',
    icon: 'Sparkle',
    gradient: 'from-slate-500 to-slate-600',
    bgGradient: 'from-slate-50 to-slate-100',
    borderColor: 'border-slate-200',
    active: true,
    stripe: {
      test: { productId: null, priceId: null },
      live: { productId: null, priceId: null },
    },
  },
]

/**
 * Get a plan by ID from the catalog.
 */
export function getPlanById(id: string): StripeCatalogPlan | undefined {
  return MEMBERSHIP_CATALOG.find((p) => p.id === id)
}

/**
 * Get only active plans from the catalog.
 */
export function getActivePlans(): StripeCatalogPlan[] {
  return MEMBERSHIP_CATALOG.filter((p) => p.active)
}

/**
 * Get the Stripe price ID for a plan in the specified mode.
 * Returns null if not configured or if plan is 'custom'.
 */
export function getStripePriceId(
  planId: string,
  mode: 'test' | 'live',
): string | null {
  const plan = getPlanById(planId)
  if (!plan) return null
  return plan.stripe[mode].priceId
}

/**
 * Get the Stripe product ID for a plan in the specified mode.
 */
export function getStripeProductId(
  planId: string,
  mode: 'test' | 'live',
): string | null {
  const plan = getPlanById(planId)
  if (!plan) return null
  return plan.stripe[mode].productId
}
