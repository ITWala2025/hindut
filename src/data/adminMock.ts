/**
 * Shared mock data + helpers for admin sections that don't have a
 * dedicated localStorage hook yet (receipts, media, ticket sales).
 *
 * These mirror the shape of the records expected by the spec
 * (Plan/ADMIN_PORTAL.md) so the UI can be wired up before the
 * Stripe + Supabase backend is in place.
 */

export type ReceiptType = 'membership' | 'donation' | 'event'

export interface ReceiptRecord {
  id: string
  recipientName: string
  recipientEmail: string
  amount: number
  currency: 'EUR'
  date: string
  type: ReceiptType
  description: string
  /** Mock URL — generated client-side when "Download PDF" is clicked. */
  pdfMock?: string
}

export const MOCK_RECEIPTS: ReceiptRecord[] = [
  {
    id: 'rcpt-2026-0001',
    recipientName: 'Ravi Kumar',
    recipientEmail: 'ravi.k@example.com',
    amount: 250,
    currency: 'EUR',
    date: '2026-05-12',
    type: 'donation',
    description: 'Temple build contribution',
  },
  {
    id: 'rcpt-2026-0002',
    recipientName: 'Sneha Patil',
    recipientEmail: 'sneha.p@example.com',
    amount: 50,
    currency: 'EUR',
    date: '2026-05-10',
    type: 'donation',
    description: 'Annadanam sponsorship',
  },
  {
    id: 'rcpt-2026-0003',
    recipientName: 'Aarav Sharma',
    recipientEmail: 'aarav@example.com',
    amount: 75,
    currency: 'EUR',
    date: '2026-05-08',
    type: 'membership',
    description: 'Annual family membership',
  },
  {
    id: 'rcpt-2026-0004',
    recipientName: 'Joshi Family',
    recipientEmail: 'joshi@example.com',
    amount: 30,
    currency: 'EUR',
    date: '2026-05-04',
    type: 'event',
    description: 'Sri Rama Navami tickets (x2)',
  },
  {
    id: 'rcpt-2026-0005',
    recipientName: 'Lakshmi Narayan',
    recipientEmail: 'lakshmi.n@example.com',
    amount: 100,
    currency: 'EUR',
    date: '2026-04-29',
    type: 'donation',
    description: 'General donation',
  },
  {
    id: 'rcpt-2026-0006',
    recipientName: 'Vikram Iyer',
    recipientEmail: 'v.iyer@example.com',
    amount: 25,
    currency: 'EUR',
    date: '2026-04-22',
    type: 'event',
    description: 'Bhajan night ticket',
  },
]

export interface ReceiptTemplate {
  id: string
  name: string
  body: string
}

export const DEFAULT_RECEIPT_TEMPLATES: ReceiptTemplate[] = [
  {
    id: 'tmpl-membership',
    name: 'Membership receipt',
    body: `<h1>Hindu Association of Ireland</h1>
<p>Receipt #{{receiptId}}</p>
<p>Dear {{recipientName}},</p>
<p>Thank you for your membership contribution of €{{amount}} received on {{date}}.</p>
<p>{{description}}</p>
<p>— Hindu Association of Ireland (CHY 12345)</p>`,
  },
  {
    id: 'tmpl-donation',
    name: 'Donation receipt',
    body: `<h1>Hindu Association of Ireland</h1>
<p>Receipt #{{receiptId}}</p>
<p>Dear {{recipientName}},</p>
<p>We gratefully acknowledge your donation of €{{amount}} on {{date}} towards "{{description}}".</p>
<p>This receipt may be used for tax purposes.</p>
<p>— Hindu Association of Ireland (CHY 12345)</p>`,
  },
  {
    id: 'tmpl-event',
    name: 'Event ticket receipt',
    body: `<h1>Hindu Association of Ireland</h1>
<p>Receipt #{{receiptId}}</p>
<p>Dear {{recipientName}},</p>
<p>Your purchase of €{{amount}} for "{{description}}" on {{date}} is confirmed.</p>
<p>Please bring this receipt or your email confirmation to the venue.</p>`,
  },
]

export interface MediaItem {
  id: string
  filename: string
  url: string
  folder: 'events' | 'temple' | 'community' | 'general'
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
  alt: string
}

export const MOCK_MEDIA: MediaItem[] = [
  {
    id: 'media-001',
    filename: 'temple-front.jpg',
    url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600&q=80',
    folder: 'temple',
    sizeKb: 420,
    uploadedBy: 'admin@hindut.ie',
    uploadedAt: '2026-05-12',
    alt: 'Temple front view',
  },
  {
    id: 'media-002',
    filename: 'rama-navami-2026.jpg',
    url: 'https://images.unsplash.com/photo-1604608672516-f1b9b1a96b1d?w=600&q=80',
    folder: 'events',
    sizeKb: 312,
    uploadedBy: 'editor@hindut.ie',
    uploadedAt: '2026-05-04',
    alt: 'Sri Rama Navami celebrations',
  },
  {
    id: 'media-003',
    filename: 'annadanam-volunteers.jpg',
    url: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600&q=80',
    folder: 'community',
    sizeKb: 278,
    uploadedBy: 'editor@hindut.ie',
    uploadedAt: '2026-04-28',
    alt: 'Annadanam volunteers serving meals',
  },
  {
    id: 'media-004',
    filename: 'bhajan-night.jpg',
    url: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=600&q=80',
    folder: 'events',
    sizeKb: 354,
    uploadedBy: 'admin@hindut.ie',
    uploadedAt: '2026-04-19',
    alt: 'Bhajan night gathering',
  },
  {
    id: 'media-005',
    filename: 'community-puja.jpg',
    url: 'https://images.unsplash.com/photo-1604608672516-f1b9b1a96b1d?w=600&q=80',
    folder: 'community',
    sizeKb: 401,
    uploadedBy: 'admin@hindut.ie',
    uploadedAt: '2026-04-10',
    alt: 'Community puja',
  },
  {
    id: 'media-006',
    filename: 'temple-deity.jpg',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&q=80',
    folder: 'temple',
    sizeKb: 512,
    uploadedBy: 'admin@hindut.ie',
    uploadedAt: '2026-03-30',
    alt: 'Deity at temple',
  },
]

export interface AttendeeRecord {
  id: string
  eventId: string
  name: string
  email: string
  tier: string
  quantity: number
  paid: number
  purchasedAt: string
}

export const MOCK_ATTENDEES: AttendeeRecord[] = [
  {
    id: 'att-001',
    eventId: 'evt-rama-navami',
    name: 'Joshi Family',
    email: 'joshi@example.com',
    tier: 'Family',
    quantity: 1,
    paid: 30,
    purchasedAt: '2026-05-04',
  },
  {
    id: 'att-002',
    eventId: 'evt-rama-navami',
    name: 'Ravi Kumar',
    email: 'ravi.k@example.com',
    tier: 'Adult',
    quantity: 2,
    paid: 20,
    purchasedAt: '2026-05-05',
  },
  {
    id: 'att-003',
    eventId: 'evt-rama-navami',
    name: 'Sneha Patil',
    email: 'sneha.p@example.com',
    tier: 'Adult',
    quantity: 1,
    paid: 10,
    purchasedAt: '2026-05-06',
  },
]
