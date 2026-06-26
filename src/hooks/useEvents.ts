import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventCategory, EventService, TempleEvent, TicketTier } from '@/data/events'

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// Shape returned by Supabase for events rows
interface EventRow {
  id: string
  title: string
  description: string | null
  start_date: string
  location: string | null
  image_url: string | null
  is_paid: boolean
  ticket_price_eur: number | null
  stripe_product_id: string | null
  ticket_tiers: TicketTier[] | null
  event_services: EventService[] | null
  category: string | null
  time_display: string | null
  start_time: string | null
  end_time: string | null
  published: boolean
  slug: string | null
}

function toTempleEvent(row: EventRow): TempleEvent {
  const startTime = row.start_time ?? undefined
  const endTime   = row.end_time   ?? undefined
  const time = startTime && endTime
    ? `${startTime} – ${endTime}`
    : startTime ?? undefined

  return {
    id: row.id,
    slug: row.slug ?? toSlug(row.title),
    title: row.title,
    description: row.description ?? '',
    date: row.start_date.slice(0, 10),
    startTime,
    endTime,
    time,
    location: row.location ?? '',
    category: (row.category as EventCategory) ?? 'community',
    isPaid: row.is_paid,
    price: row.ticket_price_eur ?? undefined,
    image: row.image_url ?? undefined,
    stripeProductId: row.stripe_product_id ?? undefined,
    ticketTiers: row.ticket_tiers ?? undefined,
    eventServices: row.event_services ?? undefined,
    published: row.published,
  }
}

/**
 * Supabase-backed event store. Fetches from `public.events`.
 * Anon users see only published events; authenticated admin/editor users
 * see all via RLS bypass.
 */
export function useEvents() {
  const [events, setEvents] = useState<TempleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      setEvents((data as EventRow[]).map(toTempleEvent))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const addEvent = useCallback(async (event: Omit<TempleEvent, 'id'>): Promise<string> => {
    const { data, error: err } = await supabase
      .from('events')
      .insert({
        title: event.title,
        description: event.description,
        start_date: event.date,
        location: event.location,
        category: event.category,
        start_time: event.startTime ?? null,
        end_time:   event.endTime   ?? null,
        time_display: event.startTime && event.endTime
          ? `${event.startTime} – ${event.endTime}`
          : event.startTime ?? null,
        is_paid: event.isPaid,
        ticket_price_eur: event.price ?? null,
        stripe_product_id: event.stripeProductId ?? null,
        ticket_tiers: event.ticketTiers ?? null,
        event_services: event.isPaid ? [] : (event.eventServices ?? []),
        image_url: event.image ?? null,
        published: true,
        slug: event.slug || toSlug(event.title),
      })
      .select('id')
      .single()
    if (err) throw new Error(err.message)
    await fetchEvents()
    return (data as { id: string }).id
  }, [fetchEvents])

  const updateEvent = useCallback(
    async (id: string, patch: Partial<Omit<TempleEvent, 'id'>>) => {
      const update: Record<string, unknown> = {}
      if (patch.title !== undefined)         update.title            = patch.title
      if (patch.description !== undefined)   update.description      = patch.description
      if (patch.date !== undefined)          update.start_date       = patch.date
      if (patch.location !== undefined)      update.location         = patch.location
      if (patch.category !== undefined)      update.category         = patch.category
      if (patch.startTime !== undefined)     update.start_time       = patch.startTime ?? null
      if (patch.endTime   !== undefined)     update.end_time         = patch.endTime   ?? null
      if (patch.startTime !== undefined || patch.endTime !== undefined) {
        const st = patch.startTime ?? undefined
        const et = patch.endTime   ?? undefined
        update.time_display = st && et ? `${st} – ${et}` : st ?? null
      }
      if (patch.isPaid !== undefined)        update.is_paid          = patch.isPaid
      if (patch.price !== undefined)         update.ticket_price_eur = patch.price
      if (patch.stripeProductId !== undefined) update.stripe_product_id = patch.stripeProductId
      if (patch.ticketTiers !== undefined)   update.ticket_tiers     = patch.ticketTiers
      if (patch.eventServices !== undefined) update.event_services   = patch.isPaid ? [] : patch.eventServices
      if ('image' in patch)                  update.image_url        = patch.image ?? null
      if (patch.slug !== undefined)          update.slug             = patch.slug || toSlug(patch.title ?? '')
      const { error: err } = await supabase.from('events').update(update).eq('id', id)
      if (err) throw new Error(err.message)
      await fetchEvents()
    },
    [fetchEvents],
  )

  const deleteEvent = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('events').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { events, loading, error, addEvent, updateEvent, deleteEvent, refetch: fetchEvents }
}

/** Returns a single published event by its slug (or derived slug for legacy events). */
export function useEventBySlug(slug: string | undefined) {
  const { events, loading, error } = useEvents()
  const event = useMemo(() => {
    if (!slug) return null
    return events.find((e) => e.slug === slug) ?? null
  }, [events, slug])
  return { event, loading, error }
}

/** Convenience: sort events ascending by date. */
export function sortByDate(events: TempleEvent[]): TempleEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date))
}

/** Convenience: only events on or after today. */
export function upcomingOnly(events: TempleEvent[]): TempleEvent[] {
  const today = new Date().toISOString().slice(0, 10)
  return sortByDate(events).filter((e) => e.date >= today)
}

