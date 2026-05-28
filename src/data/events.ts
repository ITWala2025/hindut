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

export interface TempleEvent {
  id: string
  slug: string
  title: string
  description: string
  date: string
  time?: string
  location: string
  category: EventCategory
  isPaid: boolean
  price?: number
  image?: string
  stripeProductId?: string
  ticketTiers?: TicketTier[]
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
