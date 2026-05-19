/**
 * Membership types.
 * Plans are fetched from `public.membership_plans` via the `useMembership` hook.
 */

export type MembershipPlanId = 'monthly' | 'semi-annual' | 'annual'

export interface MembershipPlan {
  id: MembershipPlanId
  name: string
  durationLabel: string
  durationMonths: number
  price: number
  description: string
  benefits: string[]
  popular?: boolean
}

export interface MembershipRecord {
  id: string
  memberCode?: string
  planId: MembershipPlanId
  fullName: string
  email: string
  phone?: string
  startDate: string
  expiresOn: string
  status: 'active' | 'expired' | 'pending'
  paymentMethod: 'stripe' | 'manual'
  reference: string
  stripeCustomerId?: string
}
