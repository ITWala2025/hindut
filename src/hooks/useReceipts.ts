import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReceiptRecord, ReceiptTemplate, ReceiptType } from '@/lib/types'

interface ReceiptRow {
  id: string
  type: string | null
  related_id: string | null
  template_id: string | null
  recipient_name: string | null
  recipient_email: string | null
  amount_eur: number | null
  description: string | null
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
    recipientName: row.recipient_name ?? '',
    recipientEmail: row.recipient_email ?? '',
    amount: Number(row.amount_eur ?? 0),
    currency: 'EUR',
    date: row.created_at.slice(0, 10),
    type: (row.type as ReceiptType) ?? 'donation',
    description: row.description ?? `${row.type ?? 'Receipt'} #${row.related_id ?? row.id.slice(0, 8)}`,  
    pdfMock: row.pdf_url ?? undefined,
  }
}

function toTemplate(row: TemplateRow): ReceiptTemplate {
  return { id: row.id, name: row.name, body: row.body }
}

/**
 * Supabase-backed receipts hook. Admin-only via RLS.
 */
export function useReceipts() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([])
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReceipts = useCallback(async () => {
    // Only fetch if the user is authenticated — receipts are admin/editor only.
    // Querying without a session causes a permission-denied error (anon has no grant).
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    setLoading(true)
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

  const issueReceipt = useCallback(
    async (input: {
      recipientName: string
      recipientEmail: string
      amount: number
      type: ReceiptType
      description?: string
      templateId?: string
    }): Promise<ReceiptRecord> => {
      const { data, error: err } = await supabase
        .from('receipts')
        .insert({
          recipient_name: input.recipientName,
          recipient_email: input.recipientEmail,
          amount_eur: input.amount,
          type: input.type,
          related_id: null,
          template_id: input.templateId ?? null,
        })
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const record = toReceiptRecord(data as ReceiptRow)
      setReceipts((prev) => [record, ...prev])
      return record
    },
    [],
  )

  const saveTemplate = useCallback(
    async (template: Omit<ReceiptTemplate, 'id'>): Promise<ReceiptTemplate> => {
      const { data, error: err } = await supabase
        .from('receipt_templates')
        .insert({ name: template.name, body: template.body })
        .select('*')
        .single()
      if (err) throw new Error(err.message)
      const t = toTemplate(data as TemplateRow)
      setTemplates((prev) => [...prev, t])
      return t
    },
    [],
  )

  return { receipts, templates, loading, error, issueReceipt, saveTemplate, refetch: fetchReceipts }
}
