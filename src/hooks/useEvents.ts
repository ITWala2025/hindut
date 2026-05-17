import { useCallback, useEffect, useState } from 'react'
import { SEED_EVENTS, type TempleEvent } from '@/data/events'

const STORAGE_KEY = 'hai.events.v1'

/**
 * Phase 1: in-memory + localStorage-backed event store. Returns the current
 * list and CRUD helpers so the public Events page and the admin Events page
 * stay in sync within a single browser session.
 */
export function useEvents() {
  const [events, setEvents] = useState<TempleEvent[]>(() => {
    if (typeof window === 'undefined') return SEED_EVENTS
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return SEED_EVENTS
      const parsed = JSON.parse(raw) as TempleEvent[]
      if (!Array.isArray(parsed) || parsed.length === 0) return SEED_EVENTS
      return parsed
    } catch {
      return SEED_EVENTS
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
    } catch {
      // Storage may be unavailable (private mode). Ignore.
    }
  }, [events])

  // Sync across tabs / windows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue) as TempleEvent[]
        if (Array.isArray(parsed)) setEvents(parsed)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addEvent = useCallback((event: Omit<TempleEvent, 'id'>) => {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setEvents((prev) => [...prev, { ...event, id }])
    return id
  }, [])

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<TempleEvent, 'id'>>) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      )
    },
    [],
  )

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const resetEvents = useCallback(() => {
    setEvents(SEED_EVENTS)
  }, [])

  return { events, addEvent, updateEvent, deleteEvent, resetEvents }
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
