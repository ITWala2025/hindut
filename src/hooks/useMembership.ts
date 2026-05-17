import { useCallback, useEffect, useState } from 'react'
import {
  MEMBERSHIP_PLANS,
  type MembershipPlan,
  type MembershipPlanId,
  type MembershipRecord,
} from '@/data/membership'

const STORAGE_KEY = 'hai.memberships.v1'

function loadInitial(): MembershipRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MembershipRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Phase 1: localStorage-backed membership store with a mock payment
 * processor. Calling `purchase` simulates the gateway round-trip and
 * persists an active `MembershipRecord`.
 */
export function useMembership() {
  const [memberships, setMemberships] = useState<MembershipRecord[]>(loadInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memberships))
    } catch {
      /* ignore */
    }
  }, [memberships])

  const getPlan = useCallback(
    (id: MembershipPlanId): MembershipPlan | undefined =>
      MEMBERSHIP_PLANS.find((p) => p.id === id),
    [],
  )

  /**
   * Simulate a payment gateway call. Resolves with the new membership
   * record after a short delay so the UI can show a processing state.
   */
  const purchase = useCallback(
    async (input: {
      planId: MembershipPlanId
      fullName: string
      email: string
      phone?: string
      paymentMethod: MembershipRecord['paymentMethod']
    }): Promise<MembershipRecord> => {
      const plan = MEMBERSHIP_PLANS.find((p) => p.id === input.planId)
      if (!plan) throw new Error(`Unknown plan: ${input.planId}`)

      // Mock gateway latency.
      await new Promise((r) => setTimeout(r, 1500))

      const now = new Date()
      const expires = new Date(now)
      expires.setMonth(expires.getMonth() + plan.durationMonths)

      const record: MembershipRecord = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        planId: plan.id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        startDate: now.toISOString().slice(0, 10),
        expiresOn: expires.toISOString().slice(0, 10),
        status: 'active',
        paymentMethod: input.paymentMethod,
        reference: `MOCK-${input.paymentMethod.toUpperCase()}-${Math.random()
          .toString(36)
          .slice(2, 10)
          .toUpperCase()}`,
      }

      setMemberships((prev) => [record, ...prev])
      return record
    },
    [],
  )

  const cancel = useCallback((id: string) => {
    setMemberships((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'expired' } : m)),
    )
  }, [])

  const setStatus = useCallback(
    (id: string, status: MembershipRecord['status']) => {
      setMemberships((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      )
    },
    [],
  )

  const remove = useCallback((id: string) => {
    setMemberships((prev) => prev.filter((m) => m.id !== id))
  }, [])

  /**
   * Mock equivalent of the spec's "Sync Stripe" action — pretends to call
   * the Stripe API, then back-fills a deterministic-looking customer id
   * onto every record that doesn't already have one.
   */
  const syncStripe = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 1200))
    setMemberships((prev) =>
      prev.map((m) =>
        m.stripeCustomerId
          ? m
          : {
              ...m,
              stripeCustomerId: `cus_MOCK${m.id.slice(-6).toUpperCase()}`,
            },
      ),
    )
  }, [])

  return {
    memberships,
    plans: MEMBERSHIP_PLANS,
    getPlan,
    purchase,
    cancel,
    setStatus,
    remove,
    syncStripe,
  }
}
