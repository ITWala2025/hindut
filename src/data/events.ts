/**
 * Event types and constants.
 * Data is fetched from `public.events` via the `useEvents` hook.
 */

export type EventCategory =
  | 'festival'
  | 'prayer'
  | 'celebration'
  | 'community'
  | 'cultural'

export interface EventService {
  id: string        // local entry UUID (stable reference in event_services array)
  serviceId: string // soft-ref to public.services.id
  name: string      // denormalized from services.title at time of linking
  amountEur: number
}

export interface TempleEvent {
  id: string
  slug: string
  title: string
  description: string
  date: string
  startTime?: string   // e.g. "4:00 PM" — Ireland time (Europe/Dublin)
  endTime?: string     // e.g. "7:00 PM" — Ireland time, optional
  time?: string        // computed: "${startTime} – ${endTime}" or startTime; kept for display compat
  location: string
  category: EventCategory
  isPaid: boolean
  price?: number
  image?: string
  stripeProductId?: string
  ticketTiers?: TicketTier[]
  eventServices?: EventService[]
  published: boolean
}

export interface TicketTier {
  id: string
  label: string
  price: number
  quantity: number
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: 'Festival',
  prayer: 'Prayer',
  celebration: 'Celebration',
  community: 'Community',
  cultural: 'Cultural',
}
