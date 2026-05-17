/**
 * Phase 1: Membership plans and mock subscription record types.
 *
 * Prices and structure mirror `PUBLIC_SITE.md`. No real payment processor
 * is used — the payment dialog simulates Stripe / PayPal / SumUp flows and
 * stores the resulting membership in `localStorage`.
 */

export type MembershipPlanId = 'monthly' | 'semi-annual' | 'annual'

export interface MembershipPlan {
  id: MembershipPlanId
  name: string
  durationLabel: string
  durationMonths: number
  /** Price in EUR. */
  price: number
  /** Marketing description shown on the membership card. */
  description: string
  /** Benefits bullet list. */
  benefits: string[]
  /** Marked as the recommended / popular plan. */
  popular?: boolean
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    durationLabel: '1 month',
    durationMonths: 1,
    price: 4,
    description: 'A flexible way to support the temple month by month.',
    benefits: [
      'Member newsletter',
      'Event invitations',
      'Voting rights at AGM (after 3 consecutive months)',
    ],
  },
  {
    id: 'semi-annual',
    name: 'Semi-Annual',
    durationLabel: '6 months',
    durationMonths: 6,
    price: 12,
    description: 'Six months of community membership at a discounted rate.',
    benefits: [
      'All Monthly benefits',
      'Priority booking for paid events',
      'Free entry to one cultural event',
    ],
    popular: true,
  },
  {
    id: 'annual',
    name: 'Annual',
    durationLabel: '1 year',
    durationMonths: 12,
    price: 20,
    description: 'Our best value — a full year of supporting the Temple Project.',
    benefits: [
      'All Semi-Annual benefits',
      'Full AGM voting rights',
      'Annual report and tax receipt',
      'Recognition on member wall',
    ],
  },
]

export interface MembershipRecord {
  id: string
  planId: MembershipPlanId
  fullName: string
  email: string
  phone?: string
  startDate: string
  expiresOn: string
  status: 'active' | 'expired' | 'pending'
  paymentMethod: 'stripe' | 'paypal' | 'sumup'
  /** Mock payment reference — not a real transaction id. */
  reference: string
  /** Optional Stripe customer id; populated by the mock Sync Stripe action. */
  stripeCustomerId?: string
}
