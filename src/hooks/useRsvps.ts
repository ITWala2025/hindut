import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateDisplay } from '@/lib/utils'

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
  selected_schedules?: any[] | null
}

export interface RsvpFilters {
  eventId?: string
  fromDate?: string
  toDate?: string
  status?: string
  slotId?: string
}

function escapeCSV(value: unknown, forceText: boolean = false): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  const isNumericLooking = /^\d+$/.test(str)
  const needsQuotePrefix = forceText || isNumericLooking
  let result = str
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    result = `"${str.replace(/"/g, '""')}"`
  }
  if (needsQuotePrefix && !result.startsWith('"')) {
    result = `'${result}`
  }
  return result
}

function generateClientSideCsv(rows: RsvpRow[], slotId?: string): string {
  const csvHeaders = [
    'Reference', 'Event', 'Selected Day', 'Selected Slot', 'Slot Count',
    'First Name', 'Last Name', 'Phone', 'Email',
    'Adults', 'Children', 'Status', 'Confirmation Sent', 'Submitted At',
  ]

  let targetRows = rows
  if (slotId && slotId !== 'all') {
    targetRows = rows.filter((r) =>
      Array.isArray(r.selected_schedules) &&
      r.selected_schedules.some((s: any) => s.id === slotId || s.title === slotId)
    )
  }

  const csvRows = targetRows.map((r) => {
    const schedules: any[] = Array.isArray(r.selected_schedules) ? r.selected_schedules : []

    const selectedDay = schedules.length > 0
      ? Array.from(new Set(schedules.map((s: any) => formatDateDisplay(s.date)).filter(Boolean))).join('; ')
      : 'Single Event'

    const selectedSlot = schedules.length > 0
      ? schedules.map((s: any) => {
          const timeStr = s.startTime ? (s.endTime ? `${s.startTime} – ${s.endTime}` : s.startTime) : ''
          return `${s.title || 'Session'}${timeStr ? ` (${timeStr})` : ''}`
        }).filter(Boolean).join('; ')
      : 'General Entry'

    const slotCount = schedules.length > 0 ? schedules.length : 1

    const values = [
      r.reference_number,
      r.event_title,
      selectedDay,
      selectedSlot,
      slotCount,
      r.first_name,
      r.last_name,
      r.phone_masked,
      r.email_masked,
      r.num_adults,
      r.num_children,
      r.status,
      r.confirmation_sent_at ? new Date(r.confirmation_sent_at).toISOString() : '',
      new Date(r.created_at).toISOString(),
    ]

    const textForceFields = new Set([7])

    return values
      .map((v, idx) => escapeCSV(v, textForceFields.has(idx)))
      .join(',')
  })

  return [csvHeaders.join(','), ...csvRows].join('\r\n')
}

export function useRsvps(filters?: RsvpFilters) {
  const [rsvps, setRsvps] = useState<RsvpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stabilise filter and data references
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const rsvpsRef = useRef(rsvps)
  rsvpsRef.current = rsvps

  const fetchRsvps = useCallback(async () => {
    setLoading(true)
    setError(null)

    const f = filtersRef.current

    let query = supabase
      .from('event_rsvps')
      .select(
        `id, event_id, reference_number, first_name, last_name,
         phone_masked, email_masked, num_adults, num_children,
         consent_gdpr, status, confirmation_sent_at, created_at, selected_schedules,
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

  /** Trigger a CSV download via the rsvp-export Netlify Function, with dev fallback. */
  const exportCsv = useCallback(
    async (exportFilters?: RsvpFilters) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const f = exportFilters ?? filtersRef.current
      try {
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
            slotId:   f?.slotId   ?? null,
          }),
        })

        if (!res.ok) {
          // If running in local Vite dev server without Netlify Functions CLI (HTTP 404),
          // fallback to client-side CSV generation so development and testing works smoothly.
          if (res.status === 404) {
            console.warn('[useRsvps] Netlify function rsvp-export returned 404. Falling back to client-side CSV generation.')
            const csvText = generateClientSideCsv(rsvpsRef.current, f?.slotId)
            const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' })
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href     = url
            a.download = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            return
          }

          let errorMsg = 'Export failed'
          try {
            const errorData = await res.json()
            errorMsg = errorData?.error ?? errorMsg
          } catch {
            errorMsg = `HTTP ${res.status}: ${res.statusText}`
          }
          const cleanMsg = errorMsg.split('\n')[0].trim()
          console.error('RSVP export API error:', { status: res.status, message: errorMsg })
          throw new Error(cleanMsg)
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
      } catch (err: any) {
        // Fallback if fetch itself failed (e.g. network failure)
        if (err?.message?.includes('404') || err?.message?.includes('Failed to fetch')) {
          console.warn('[useRsvps] Fetch failed, generating client-side CSV fallback:', err)
          const csvText = generateClientSideCsv(rsvpsRef.current, f?.slotId)
          const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' })
          const url  = URL.createObjectURL(blob)
          const a    = document.createElement('a')
          a.href     = url
          a.download = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          return
        }
        throw err
      }
    },
    [],
  )

  return { rsvps, loading, error, refetch: fetchRsvps, cancelRsvp, exportCsv }
}
