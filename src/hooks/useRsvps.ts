import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface RsvpRow {
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
  consent_gdpr: boolean
  status: 'confirmed' | 'cancelled'
  confirmation_sent_at: string | null
  created_at: string
}

export interface RsvpFilters {
  eventId?: string
  fromDate?: string
  toDate?: string
  status?: string
}

export function useRsvps(filters?: RsvpFilters) {
  const [rsvps, setRsvps] = useState<RsvpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stabilise filter reference so useEffect doesn't loop
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const fetchRsvps = useCallback(async () => {
    setLoading(true)
    setError(null)

    const f = filtersRef.current

    let query = supabase
      .from('event_rsvps')
      .select(
        `id, event_id, reference_number, first_name, last_name,
         phone_masked, email_masked, num_adults, num_children,
         consent_gdpr, status, confirmation_sent_at, created_at,
         events!inner(title)`,
      )
      .order('created_at', { ascending: false })

    if (f?.eventId)   query = query.eq('event_id', f.eventId)
    if (f?.fromDate)  query = query.gte('created_at', f.fromDate)
    if (f?.toDate)    query = query.lte('created_at', `${f.toDate}T23:59:59Z`)
    if (f?.status)    query = query.eq('status', f.status)

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setRsvps(
        (data ?? []).map((row: Record<string, unknown>) => ({
          ...(row as Omit<RsvpRow, 'event_title'>),
          event_title: (row.events as { title: string } | null)?.title ?? '',
        })),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRsvps() }, [fetchRsvps])

  const cancelRsvp = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('event_rsvps')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (err) throw new Error(err.message)
      await fetchRsvps()
    },
    [fetchRsvps],
  )

  /** Trigger a CSV download via the rsvp-export Netlify Function. */
  const exportCsv = useCallback(
    async (exportFilters?: RsvpFilters) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const f = exportFilters ?? filtersRef.current
      const res = await fetch('/.netlify/functions/rsvp-export', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          eventId:  f?.eventId  ?? null,
          fromDate: f?.fromDate ?? null,
          toDate:   f?.toDate   ?? null,
          status:   f?.status   ?? null,
        }),
      })

      if (!res.ok) {
        let errorMsg = 'Export failed'
        try {
          const errorData = await res.json()
          errorMsg = errorData?.error ?? errorMsg
        } catch {
          errorMsg = `HTTP ${res.status}: ${res.statusText}`
        }
        console.error('RSVP export API error:', { status: res.status, message: errorMsg })
        throw new Error(errorMsg)
      }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [],
  )

  return { rsvps, loading, error, refetch: fetchRsvps, cancelRsvp, exportCsv }
}
