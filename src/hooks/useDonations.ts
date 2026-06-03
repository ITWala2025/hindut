import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface DonationRow {
  id: string
  donor_name: string | null
  donor_email: string | null
  stripe_payment_intent_id: string | null
  stripe_subscription_id: string | null
  gateway: 'stripe' | 'manual'
  amount_eur: number
  currency: string
  recurring: boolean
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  description: string | null
  created_at: string
  updated_at: string
}

export interface DonationFilters {
  fromDate?: string
  toDate?: string
  status?: string
  gateway?: string
}

export interface NewDonation {
  donor_name?: string
  donor_email?: string
  amount_eur: number
  gateway: 'stripe' | 'manual'
  status: DonationRow['status']
  recurring: boolean
  description?: string
}

export function useDonations(filters?: DonationFilters) {
  const [donations, setDonations] = useState<DonationRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  // One-time cleanup: remove phantom "pending" rows that were pre-created during
  // monthly-contribution subscription setup before the webhook fix (May 2026).
  // These rows have recurring=true, status=pending and no payment_intent_id.
  useEffect(() => {
    supabase
      .from('donations')
      .delete()
      .eq('recurring', true)
      .eq('status', 'pending')
      .is('stripe_payment_intent_id', null)
      .then(({ error: e }) => {
        if (e) console.warn('[useDonations] phantom-row cleanup skipped:', e.message)
      })
  }, [])

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    setError(null)

    const f = filtersRef.current

    let query = supabase
      .from('donations')
      .select(
        'id, donor_name, donor_email, stripe_payment_intent_id, stripe_subscription_id, gateway, amount_eur, currency, recurring, status, description, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      // Exclude phantom pending recurring rows (no real payment taken yet)
      .or('recurring.eq.false,status.neq.pending,stripe_payment_intent_id.not.is.null')

    if (f?.fromDate) query = query.gte('created_at', f.fromDate)
    if (f?.toDate)   query = query.lte('created_at', `${f.toDate}T23:59:59Z`)
    if (f?.status)   query = query.eq('status', f.status)
    if (f?.gateway)  query = query.eq('gateway', f.gateway)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setDonations((data ?? []) as DonationRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchDonations() }, [fetchDonations])

  const updateStatus = useCallback(
    async (id: string, status: DonationRow['status']) => {
      const { error: err } = await supabase
        .from('donations')
        .update({ status })
        .eq('id', id)
      if (err) throw new Error(err.message)
      await fetchDonations()
    },
    [fetchDonations],
  )

  const addDonation = useCallback(
    async (donation: NewDonation) => {
      const { error: err } = await supabase
        .from('donations')
        .insert({
          donor_name:  donation.donor_name  || null,
          donor_email: donation.donor_email || null,
          gateway:     donation.gateway,
          amount_eur:  donation.amount_eur,
          currency:    'EUR',
          recurring:   donation.recurring,
          status:      donation.status,
          description: donation.description || null,
        })
      if (err) throw new Error(err.message)
      await fetchDonations()
    },
    [fetchDonations],
  )

  const deleteDonation = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('donations')
        .delete()
        .eq('id', id)
      if (err) throw new Error(err.message)
      await fetchDonations()
    },
    [fetchDonations],
  )

  return {
    donations,
    loading,
    error,
    refetch: fetchDonations,
    updateStatus,
    addDonation,
    deleteDonation,
  }
}

export interface RecurringDonationCharge {
  id:        string
  date:      string  // YYYY-MM-DD
  amountEur: number
  status:    'pending' | 'succeeded' | 'failed' | 'refunded'
}

/**
 * Fetches all charge rows for a recurring donation subscription.
 * Queries by stripe_subscription_id so the admin can see the full history
 * of monthly charges tied to a single recurring-donation subscription.
 */
export function useRecurringDonationHistory(stripeSubscriptionId: string | null | undefined) {
  const [charges, setCharges]   = useState<RecurringDonationCharge[]>([])
  const [loading, setLoading]   = useState(!!stripeSubscriptionId)

  useEffect(() => {
    if (!stripeSubscriptionId) { setCharges([]); setLoading(false); return }

    setLoading(true)
    supabase
      .from('donations')
      .select('id, amount_eur, status, created_at')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          console.error('[useRecurringDonationHistory] fetch error:', err.message)
        } else {
          setCharges(
            (data ?? []).map((row: { id: string; amount_eur: number; status: string; created_at: string }) => ({
              id:        row.id,
              date:      row.created_at.slice(0, 10),
              amountEur: Number(row.amount_eur),
              status:    row.status as RecurringDonationCharge['status'],
            })),
          )
        }
        setLoading(false)
      })
  }, [stripeSubscriptionId])

  return { charges, loading }
}
