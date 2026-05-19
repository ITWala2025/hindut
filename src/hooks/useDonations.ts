import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface DonationRow {
  id: string
  donor_name: string | null
  donor_email: string | null
  stripe_payment_intent_id: string | null
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

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    setError(null)

    const f = filtersRef.current

    let query = supabase
      .from('donations')
      .select(
        'id, donor_name, donor_email, stripe_payment_intent_id, gateway, amount_eur, currency, recurring, status, description, created_at, updated_at',
      )
      .order('created_at', { ascending: false })

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
