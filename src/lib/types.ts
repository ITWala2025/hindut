export type ReceiptType = 'membership' | 'donation' | 'event'

export interface ReceiptRecord {
  id: string
  receiptNumber: string
  relatedId: string | null
  recipientName: string
  recipientEmail: string
  amount: number
  currency: 'EUR'
  date: string
  issuedDate: string
  type: ReceiptType
  description: string
  paymentReference?: string
  templateId?: string
  isManual: boolean
  metadata?: Record<string, unknown>
  pdfUrl?: string
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
  isExternal?: boolean
  mediaType: 'image' | 'album'
  thumbnailUrl?: string
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

export interface RsvpRecord {
  id: string
  eventId: string
  eventTitle: string
  referenceNumber: string
  firstName: string
  lastName: string
  phoneMasked: string
  emailMasked: string
  numAdults: number
  numChildren: number
  consentGdpr: boolean
  status: 'confirmed' | 'cancelled'
  confirmationSentAt: string | null
  createdAt: string
}

export interface ServiceCategory {
  id: string
  name: string
  sortOrder: number
}

export interface ServiceRecord {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  imageUrl: string
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
