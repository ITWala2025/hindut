/**
 * Membership types.
 * Plans are fetched from `public.membership_plans` via the `useMembership` hook.
 */

// Plan ids are free-form strings (admin can create new plans). Well-known
// ids include 'annual', 'shraddha', 'seva', 'bhakti'.
export type MembershipPlanId = string

export type PlanCadence = 'monthly' | 'semi_annual' | 'annual'
export type PlanCategory = 'membership' | 'giving'

export interface MembershipPlan {
  id: MembershipPlanId
  name: string
  durationLabel: string
  durationMonths: number
  price: number
  description: string
  benefits: string[]
  popular?: boolean
  sortOrder: number
  cadence: PlanCadence
  category: PlanCategory
  subtitle?: string
  icon?: string
  gradient?: string
  bgGradient?: string
  borderColor?: string
  active: boolean
  // Stripe product-catalogue IDs (written by sync-membership-plans function)
  stripeProductIdTest?: string
  stripePriceIdTest?: string
  stripeProductIdLive?: string
  stripePriceIdLive?: string
}

export interface MembershipRecord {
  id: string
  memberCode?: string
  planId: MembershipPlanId
  fullName: string
  email: string
  phone?: string
  familySize?: string
  area?: string
  startDate: string
  expiresOn: string
  status: 'active' | 'expired' | 'pending'
  paymentMethod: 'stripe' | 'manual'
  reference: string
  stripeCustomerId?: string
  monthlyContributionEur?: number
  monthlyStripeSubId?: string
}
