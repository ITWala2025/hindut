/**
 * Phase 1: Event seed data and types.
 *
 * Mock data only — no external services. The active runtime list is stored
 * in `localStorage` via the `useEvents` hook, so admins can add / edit /
 * delete events without a backend.
 */

export type EventCategory =
  | 'festival'
  | 'prayer'
  | 'celebration'
  | 'community'
  | 'cultural'

export interface TempleEvent {
  /** Stable unique identifier. */
  id: string
  /** Display title, e.g. "Sri Rama Navami". */
  title: string
  /** Short description shown on cards and detail views. */
  description: string
  /** ISO 8601 date (YYYY-MM-DD). Use the current year for the seed list. */
  date: string
  /** Optional time of day, e.g. "10:00 AM - 1:00 PM". */
  time?: string
  /** Venue / location, e.g. "Ahane Hall, Limerick". */
  location: string
  /** Category used for filtering and styling. */
  category: EventCategory
  /** Free entry vs paid (ticketed). Phase 1 events are all free. */
  isPaid: boolean
  /** Optional ticket price in EUR when `isPaid` is true. */
  price?: number
  /** Optional hero image URL. */
  image?: string
  /** Stripe Product ID used for ticket checkout when paid. */
  stripeProductId?: string
  /** Optional ticket tiers for paid events (label, price, quantity). */
  ticketTiers?: TicketTier[]
}

export interface TicketTier {
  id: string
  label: string
  price: number
  quantity: number
}

/**
 * Upcoming events for the current year, sourced from the Hindu Association
 * of Ireland calendar. Dates without a specific day use the first of the
 * month as a placeholder until confirmed.
 */
export const SEED_EVENTS: TempleEvent[] = [
  {
    id: 'evt-rama-navami',
    title: 'Sri Rama Navami',
    description:
      'Celebrating the birth of Lord Rama with bhajans, abhishekam and community prasad.',
    date: '2026-03-21',
    time: '10:00 AM - 1:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'festival',
    isPaid: false,
  },
  {
    id: 'evt-hindu-new-year',
    title: 'Hindu New Year',
    description:
      'Ugadi / Gudi Padwa celebration welcoming the new year with prayers and panchanga shravanam.',
    date: '2026-04-25',
    time: '11:00 AM - 2:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'festival',
    isPaid: false,
  },
  {
    id: 'evt-akshaya-tritiya',
    title: 'Akshaya Tritiya',
    description:
      'Auspicious day of prosperity — special Lakshmi puja and community gathering.',
    date: '2026-05-09',
    time: '10:30 AM - 1:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'prayer',
    isPaid: false,
  },
  {
    id: 'evt-monthly-prayer-jun',
    title: 'Monthly Community Prayer',
    description:
      'Our regular community satsang with bhajans, arati and shared vegetarian meal.',
    date: '2026-06-06',
    time: '4:00 PM - 7:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'prayer',
    isPaid: false,
  },
  {
    id: 'evt-yoga-day',
    title: 'Ahane Yoga Day',
    description:
      'International Day of Yoga — open-air yoga session, pranayama and meditation for all ages.',
    date: '2026-06-21',
    time: '8:00 AM - 11:00 AM',
    location: 'Ahane Grounds, Limerick',
    category: 'community',
    isPaid: false,
  },
  {
    id: 'evt-monthly-prayer-jul',
    title: 'Monthly Community Prayer',
    description:
      'Our regular community satsang with bhajans, arati and shared vegetarian meal.',
    date: '2026-07-11',
    time: '4:00 PM - 7:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'prayer',
    isPaid: false,
  },
  {
    id: 'evt-independence-day',
    title: 'Independence Day Celebration',
    description:
      'Cultural programme marking Indian Independence Day with patriotic songs, dance and food.',
    date: '2026-08-15',
    time: '3:00 PM - 7:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'cultural',
    isPaid: false,
  },
  {
    id: 'evt-onam-varalakshmi-janmashtami',
    title: 'Onam, Varalakshmi Vratam & Krishna Janmashtami',
    description:
      'A combined celebration honouring three traditions — pookalam, Varalakshmi puja and midnight Janmashtami arati.',
    date: '2026-08-22',
    time: '11:00 AM - 10:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'festival',
    isPaid: false,
  },
  {
    id: 'evt-ganesh-chaturthi',
    title: 'Ganesh Chaturthi',
    description:
      'Welcoming Lord Ganesha with sthapana, ganapati homam and community celebration.',
    date: '2026-09-12',
    time: '10:00 AM - 4:00 PM',
    location: 'Pallaskenry Community Centre, Co. Limerick',
    category: 'festival',
    isPaid: false,
  },
  {
    id: 'evt-dussehra',
    title: 'Dussehra',
    description:
      'Vijayadashami celebration marking the victory of good over evil with Saraswati puja and cultural performances.',
    date: '2026-10-02',
    time: '5:00 PM - 9:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'festival',
    isPaid: false,
  },
  {
    id: 'evt-diwali-festival',
    title: 'Diwali Festival Celebration',
    description:
      'Annual Diwali cultural night — dance, music, fireworks display and traditional dinner.',
    date: '2026-11-07',
    time: '5:00 PM - 10:00 PM',
    location: 'Ahane Hall, Limerick',
    category: 'celebration',
    isPaid: true,
    price: 15,
  },
  {
    id: 'evt-diwali-prayer',
    title: 'Diwali Special Prayer',
    description:
      'Lakshmi puja, deep daan and special prayers on the auspicious evening of Diwali.',
    date: '2026-11-14',
    time: '6:00 PM - 9:00 PM',
    location: 'Mungret Community Centre, Limerick',
    category: 'prayer',
    isPaid: false,
  },
  {
    id: 'evt-monthly-prayer-dec',
    title: 'Monthly Community Prayer',
    description:
      'Year-end community satsang with bhajans, arati and shared vegetarian meal.',
    date: '2026-12-12',
    time: '4:00 PM - 7:00 PM',
    location: 'Mungret Community Centre, Limerick',
    category: 'prayer',
    isPaid: false,
  },
]

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  festival: 'Festival',
  prayer: 'Prayer',
  celebration: 'Celebration',
  community: 'Community',
  cultural: 'Cultural',
}
