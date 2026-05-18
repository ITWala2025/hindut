/**
 * Admin area types.
 * Data is fetched from Supabase via the `useReceipts`, `useMedia` hooks.
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
  pdfMock?: string
}

export interface ReceiptTemplate {
  id: string
  name: string
  body: string
}

export interface MediaItem {
  id: string
  filename: string
  url: string
  folder: 'events' | 'temple' | 'community' | 'general' | 'gallery-webp'
  sizeKb: number
  uploadedBy: string
  uploadedAt: string
  title: string
  alt: string
}

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
