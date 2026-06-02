import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MEMBERSHIP_CATALOG, type StripeCatalogPlan } from '@/data/stripeCatalogMapping'
import type {
  MembershipPlan,
  MembershipPlanId,
  MembershipRecord,
} from '@/data/membership'

// ─── DB row shapes ──────────────────────────────────────────────────────────

interface MembershipRow {
  id: string
  plan: string
  status: string
  started_at: string | null
  expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  gateway: string | null
  reference: string | null
  monthly_contribution_eur: number | null
  monthly_stripe_sub_id: string | null
  members: {
    full_name: string
    email: string | null
    phone: string | null
    member_code: string | null
  } | null
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/** Convert StripeCatalogPlan to MembershipPlan */
function catalogToMembershipPlan(catalogPlan: StripeCatalogPlan): MembershipPlan {
  return {
    id: catalogPlan.id as MembershipPlanId,
    name: catalogPlan.name,
    durationLabel: catalogPlan.durationLabel,
    durationMonths: catalogPlan.durationMonths,
    price: catalogPlan.price,
    description: catalogPlan.description,
    benefits: catalogPlan.benefits,
    popular: catalogPlan.popular,
    sortOrder: catalogPlan.sortOrder,
    cadence: catalogPlan.cadence,
    category: catalogPlan.category,
    subtitle: catalogPlan.subtitle,
    icon: catalogPlan.icon,
    gradient: catalogPlan.gradient,
    bgGradient: catalogPlan.bgGradient,
    borderColor: catalogPlan.borderColor,
    active: catalogPlan.active,
    stripeProductIdTest: catalogPlan.stripe.test.productId ?? undefined,
    stripePriceIdTest: catalogPlan.stripe.test.priceId ?? undefined,
    stripeProductIdLive: catalogPlan.stripe.live.productId ?? undefined,
    stripePriceIdLive: catalogPlan.stripe.live.priceId ?? undefined,
  }
}

function toRecord(row: MembershipRow): MembershipRecord {
  return {
    id: row.id,
    memberCode: row.members?.member_code ?? undefined,
    planId: row.plan as MembershipPlanId,
    fullName: row.members?.full_name ?? 'Unknown',
    email: row.members?.email ?? '',
    phone: row.members?.phone ?? undefined,
    startDate: row.started_at?.slice(0, 10) ?? '',
    expiresOn: row.expires_at?.slice(0, 10) ?? '',
    status: row.status as MembershipRecord['status'],
    paymentMethod: (row.stripe_customer_id ? 'stripe' : (row.gateway ?? 'manual')) as MembershipRecord['paymentMethod'],
    reference: row.reference ?? row.id.slice(0, 8).toUpperCase(),
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    monthlyContributionEur: row.monthly_contribution_eur ?? undefined,
    monthlyStripeSubId: row.monthly_stripe_sub_id ?? undefined,
  }
}

/**
 * Supabase-backed membership store.
 * Plans are loaded from the Stripe catalog mapping (src/data/stripeCatalogMapping.ts).
 * Memberships are fetched from `public.memberships` joined with `public.members`.
 */
export function useMembership() {
  const [memberships, setMemberships] = useState<MembershipRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plans come from the catalog mapping, not the database
  const plans: MembershipPlan[] = MEMBERSHIP_CATALOG.map(catalogToMembershipPlan)

  // ── Fetch memberships (admin-only via RLS) ────────────────────────────────
  const fetchMemberships = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('memberships')
      .select('*, members(full_name, email, phone, member_code)')
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setMemberships((data as MembershipRow[]).map(toRecord))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMemberships() }, [fetchMemberships])

  const getPlan = useCallback(
    (id: MembershipPlanId) => plans.find((p) => p.id === id),
    [plans],
  )

  const cancel = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('memberships')
      .update({ status: 'canceled' })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setMemberships((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'expired' } : m)),
    )
  }, [])

  const setStatus = useCallback(async (id: string, status: MembershipRecord['status']) => {
    const { error: err } = await supabase
      .from('memberships')
      .update({ status })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setMemberships((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m)),
    )
  }, [])

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('memberships').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setMemberships((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const syncStripe = useCallback(async () => {
    // Placeholder: in production, call a Supabase Edge Function or backend
    await new Promise((r) => setTimeout(r, 800))
    await fetchMemberships()
  }, [fetchMemberships])

  return {
    memberships,
    plans,
    loading,
    error,
    getPlan,
    cancel,
    setStatus,
    remove,
    syncStripe,
  }
}

