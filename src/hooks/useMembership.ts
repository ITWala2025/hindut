import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  MembershipPlan,
  MembershipPlanId,
  MembershipRecord,
} from '@/data/membership'

// ─── DB row shapes ──────────────────────────────────────────────────────────

interface PlanRow {
  id: string
  name: string
  duration_label: string
  duration_months: number
  price_eur: number
  description: string | null
  benefits: string[]
  popular: boolean
  sort_order: number
}

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
  members: {
    full_name: string
    email: string | null
    phone: string | null
    member_code: string | null
  } | null
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toPlan(row: PlanRow): MembershipPlan {
  return {
    id: row.id as MembershipPlanId,
    name: row.name,
    durationLabel: row.duration_label,
    durationMonths: row.duration_months,
    price: Number(row.price_eur),
    description: row.description ?? '',
    benefits: row.benefits ?? [],
    popular: row.popular,
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
    paymentMethod: (row.gateway ?? 'manual') as MembershipRecord['paymentMethod'],
    reference: row.reference ?? row.id.slice(0, 8).toUpperCase(),
    stripeCustomerId: row.stripe_customer_id ?? undefined,
  }
}

/**
 * Supabase-backed membership store.
 * Plans are fetched from `public.membership_plans`.
 * Memberships are fetched from `public.memberships` joined with `public.members`.
 */
export function useMembership() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [memberships, setMemberships] = useState<MembershipRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch plans (public) ──────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('membership_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (!err && data) setPlans((data as PlanRow[]).map(toPlan))
      })
  }, [])

  // ── Fetch memberships (admin-only via RLS) ────────────────────────────────
  const fetchMemberships = useCallback(async () => {
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

  /**
   * Purchase a membership.
   * Creates a `members` record (with null user_id for unauthenticated) and
   * a linked `memberships` record.
   */
  const purchase = useCallback(
    async (input: {
      planId: MembershipPlanId
      fullName: string
      email: string
      phone?: string
      paymentMethod: MembershipRecord['paymentMethod']
    }): Promise<MembershipRecord> => {
      const plan = plans.find((p) => p.id === input.planId)
      if (!plan) throw new Error(`Unknown plan: ${input.planId}`)

      // Upsert member record by email
      const { data: memberData, error: memberErr } = await supabase
        .from('members')
        .insert({
          full_name: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          user_id: null,
        })
        .select('id')
        .single()
      if (memberErr) throw new Error(memberErr.message)

      const now = new Date()
      const expires = new Date(now)
      expires.setMonth(expires.getMonth() + plan.durationMonths)

      const reference = `HAI-${input.paymentMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-6)}`

      const { data: memData, error: memErr } = await supabase
        .from('memberships')
        .insert({
          member_id: (memberData as { id: string }).id,
          plan: input.planId,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
          gateway: input.paymentMethod,
          reference,
        })
        .select('id')
        .single()
      if (memErr) throw new Error(memErr.message)

      const record: MembershipRecord = {
        id: (memData as { id: string }).id,
        planId: input.planId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        startDate: now.toISOString().slice(0, 10),
        expiresOn: expires.toISOString().slice(0, 10),
        status: 'active',
        paymentMethod: input.paymentMethod,
        reference,
      }
      setMemberships((prev) => [record, ...prev])
      return record
    },
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
    purchase,
    cancel,
    setStatus,
    remove,
    syncStripe,
  }
}

