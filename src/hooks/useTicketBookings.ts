import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface TicketBookingRow {
  id: string
  event_id: string
  event_title: string
  reference_number: string
  first_name: string
  last_name: string
  phone_masked: string
  email_masked: string
  num_adults: number
  num_children: number
  amount_eur: number
  payment_gateway: string | null
  payment_reference: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
  confirmation_sent_at: string | null
  created_at: string
}

export interface TicketBookingFilters {
  eventId?: string
  fromDate?: string
  toDate?: string
  status?: string
}

export function useTicketBookings(filters?: TicketBookingFilters) {
  const [bookings, setBookings] = useState<TicketBookingRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)

    const f = filtersRef.current

    let query = supabase
      .from('ticket_bookings')
      .select(
        `id, event_id, reference_number, first_name, last_name,
         phone_masked, email_masked, num_adults, num_children,
         amount_eur, payment_gateway, payment_reference,
         status, confirmation_sent_at, created_at,
         events!inner(title)`,
      )
      .order('created_at', { ascending: false })

    if (f?.eventId)  query = query.eq('event_id', f.eventId)
    if (f?.fromDate) query = query.gte('created_at', f.fromDate)
    if (f?.toDate)   query = query.lte('created_at', `${f.toDate}T23:59:59Z`)
    if (f?.status)   query = query.eq('status', f.status)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setBookings(
        (data ?? []).map((row: Record<string, unknown>) => ({
          ...(row as Omit<TicketBookingRow, 'event_title'>),
          event_title: (row.events as { title: string } | null)?.title ?? '',
        })),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const updateStatus = useCallback(
    async (id: string, status: TicketBookingRow['status']) => {
      const { error: err } = await supabase
        .from('ticket_bookings')
        .update({ status })
        .eq('id', id)
      if (err) throw new Error(err.message)
      await fetchBookings()
    },
    [fetchBookings],
  )

  const deleteBooking = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('ticket_bookings')
        .delete()
        .eq('id', id)
      if (err) throw new Error(err.message)
      await fetchBookings()
    },
    [fetchBookings],
  )

  return { bookings, loading, error, refetch: fetchBookings, updateStatus, deleteBooking }
}
