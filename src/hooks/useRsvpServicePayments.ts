import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface RsvpServicePaymentRow {
  id: string
  rsvp_id: string
  event_id: string
  service_id: string | null
  service_name: string
  amount_eur: number
  status: 'pending' | 'paid' | 'failed'
  stripe_session_id: string | null
  paid_at: string | null
  created_at: string
}

export interface EventServiceSummary {
  service_name: string
  service_id: string | null
  count: number
  total_eur: number
  paid_eur: number
}

export function useRsvpServicePayments(rsvpId: string | null) {
  const [payments, setPayments] = useState<RsvpServicePaymentRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!rsvpId) { setPayments([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('event_rsvp_service_payments')
      .select('*')
      .eq('rsvp_id', rsvpId)
      .order('created_at', { ascending: true })
    setPayments((data as RsvpServicePaymentRow[]) ?? [])
    setLoading(false)
  }, [rsvpId])

  useEffect(() => { void fetch() }, [fetch])

  return { payments, loading, refetch: fetch }
}

export function useEventServiceSummary(eventId: string | null) {
  const [rows, setRows] = useState<RsvpServicePaymentRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!eventId) { setRows([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('event_rsvp_service_payments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    setRows((data as RsvpServicePaymentRow[]) ?? [])
    setLoading(false)
  }, [eventId])

  useEffect(() => { void fetch() }, [fetch])

  const summary: EventServiceSummary[] = Object.values(
    rows.reduce<Record<string, EventServiceSummary>>((acc, r) => {
      const key = r.service_name
      if (!acc[key]) {
        acc[key] = { service_name: r.service_name, service_id: r.service_id, count: 0, total_eur: 0, paid_eur: 0 }
      }
      acc[key].count++
      acc[key].total_eur += r.amount_eur
      if (r.status === 'paid') acc[key].paid_eur += r.amount_eur
      return acc
    }, {}),
  )

  const totalRevenue = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount_eur, 0)
  const pendingRevenue = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount_eur, 0)

  return { summary, totalRevenue, pendingRevenue, loading, refetch: fetch }
}
