import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReceiptRecord, ReceiptTemplate, ReceiptType } from '@/lib/types'

interface ReceiptRow {
  id: string
  receipt_number: string | null
  type: string | null
  related_id: string | null
  template_id: string | null
  recipient_name: string | null
  recipient_email: string | null
  amount_eur: number | null
  description: string | null
  payment_reference: string | null
  issued_date: string | null
  is_manual: boolean | null
  metadata: Record<string, unknown> | null
  created_at: string
  pdf_url: string | null
}

interface TemplateRow {
  id: string
  name: string
  body: string
}

function toReceiptRecord(row: ReceiptRow): ReceiptRecord {
  return {
    id: row.id,
    receiptNumber: row.receipt_number ?? row.id.slice(0, 8).toUpperCase(),
    relatedId: row.related_id,
    recipientName: row.recipient_name ?? '',
    recipientEmail: row.recipient_email ?? '',
    amount: Number(row.amount_eur ?? 0),
    currency: 'EUR',
    date: row.created_at.slice(0, 10),
    issuedDate: (row.issued_date ?? row.created_at).slice(0, 10),
    type: (row.type as ReceiptType) ?? 'donation',
    description:
      row.description ?? `${row.type ?? 'Receipt'} #${row.related_id ?? row.id.slice(0, 8)}`,
    paymentReference: row.payment_reference ?? undefined,
    templateId: row.template_id ?? undefined,
    isManual: row.is_manual ?? false,
    metadata: row.metadata ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
  }
}

function toTemplate(row: TemplateRow): ReceiptTemplate {
  return { id: row.id, name: row.name, body: row.body }
}

export interface ManualReceiptInput {
  recipientName: string
  recipientEmail: string
  amount: number
  type: ReceiptType
  description: string
  paymentReference?: string
  issuedDate?: string
  templateId?: string
  metadata?: Record<string, unknown>
}

export interface ReceiptUpdateInput {
  recipientName?: string
  recipientEmail?: string
  amount?: number
  type?: ReceiptType
  description?: string
  paymentReference?: string
  issuedDate?: string
  templateId?: string
}

/**
 * Supabase-backed receipts hook. Admin-only via RLS.
 *
 * Provides full CRUD on receipts plus template management.
 * Auto-generated receipts (membership / donation / ticket) are created by
 * database triggers — see migration 20260520000042.
 */
export function useReceipts() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([])
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReceipts = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const [receiptRes, templateRes] = await Promise.all([
      supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('receipt_templates').select('*'),
    ])
    if (receiptRes.error) {
      console.error('[useReceipts] fetch error:', receiptRes.error.message, receiptRes.error)
      setError(receiptRes.error.message)
    } else {
      setReceipts((receiptRes.data as ReceiptRow[]).map(toReceiptRecord))
    }
    if (!templateRes.error && templateRes.data) {
      setTemplates((templateRes.data as TemplateRow[]).map(toTemplate))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchReceipts() }, [fetchReceipts])

  const createManualReceipt = useCallback(
    async (input: ManualReceiptInput): Promise<ReceiptRecord> => {
      const payload: Record<string, unknown> = {
        recipient_name: input.recipientName,
        recipient_email: input.recipientEmail,
        amount_eur: input.amount,
        type: input.type,
        description: input.description,
        related_id: null,
        is_manual: true,
        template_id: input.templateId ?? `tmpl-${input.type}`,
        payment_reference: input.paymentReference ?? null,
        metadata: input.metadata ?? {},
      }
      if (input.issuedDate) payload.issued_date = input.issuedDate

      const { data, error: err } = await supabase
        .from('receipts')
        .insert(payload)
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const record = toReceiptRecord(data as ReceiptRow)
      setReceipts((prev) => [record, ...prev])
      return record
    },
    [],
  )

  const updateReceipt = useCallback(
    async (id: string, input: ReceiptUpdateInput): Promise<ReceiptRecord> => {
      const payload: Record<string, unknown> = {}
      if (input.recipientName !== undefined)    payload.recipient_name    = input.recipientName
      if (input.recipientEmail !== undefined)   payload.recipient_email   = input.recipientEmail
      if (input.amount !== undefined)           payload.amount_eur        = input.amount
      if (input.type !== undefined)             payload.type              = input.type
      if (input.description !== undefined)      payload.description       = input.description
      if (input.paymentReference !== undefined) payload.payment_reference = input.paymentReference
      if (input.issuedDate !== undefined)       payload.issued_date       = input.issuedDate
      if (input.templateId !== undefined)       payload.template_id       = input.templateId

      const { data, error: err } = await supabase
        .from('receipts')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const record = toReceiptRecord(data as ReceiptRow)
      setReceipts((prev) => prev.map((r) => (r.id === id ? record : r)))
      return record
    },
    [],
  )

  const deleteReceipt = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('receipts').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setReceipts((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const saveTemplate = useCallback(
    async (template: ReceiptTemplate): Promise<ReceiptTemplate> => {
      // Upsert on id so editors save updates rather than insert new rows.
      const { data, error: err } = await supabase
        .from('receipt_templates')
        .upsert({ id: template.id, name: template.name, body: template.body }, { onConflict: 'id' })
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const t = toTemplate(data as TemplateRow)
      setTemplates((prev) => {
        const idx = prev.findIndex((p) => p.id === t.id)
        if (idx === -1) return [...prev, t]
        const next = [...prev]
        next[idx] = t
        return next
      })
      return t
    },
    [],
  )

  return {
    receipts,
    templates,
    loading,
    error,
    createManualReceipt,
    updateReceipt,
    deleteReceipt,
    saveTemplate,
    refetch: fetchReceipts,
  }
}

/**
 * Lightweight hook that fetches the receipt → related_id mapping for a given
 * type. Used by Ticket Bookings, Donations, and Members sections to flag
 * records that already have a receipt issued.
 *
 * Also exposes `downloadByRelatedId(relatedId)` which lazily fetches the full
 * receipt row and triggers a PDF download — avoids loading every receipt up
 * front when the user only wants to download a single one.
 */
export function useReceiptFlags(type: ReceiptType) {
  const [flags, setFlags] = useState<Map<string, { id: string; receiptNumber: string }>>(new Map())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('receipts')
      .select('id, related_id, receipt_number')
      .eq('type', type)
      .not('related_id', 'is', null)
    if (!err && data) {
      const map = new Map<string, { id: string; receiptNumber: string }>()
      for (const row of data as { id: string; related_id: string; receipt_number: string | null }[]) {
        map.set(row.related_id, {
          id: row.id,
          receiptNumber: row.receipt_number ?? row.id.slice(0, 8).toUpperCase(),
        })
      }
      setFlags(map)
    }
    setLoading(false)
  }, [type])

  useEffect(() => { refetch() }, [refetch])

  const fetchReceiptById = useCallback(async (id: string): Promise<ReceiptRecord | null> => {
    const { data, error: err } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single()
    if (err || !data) return null
    return toReceiptRecord(data as ReceiptRow)
  }, [])

  return { flags, loading, refetch, fetchReceiptById }
}
