import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceRecord } from '@/lib/types'

interface ServiceRow {
  id: string
  title: string
  slug: string
  category_id: string | null
  service_categories: { name: string } | null
  excerpt: string | null
  content: string | null
  image_url: string | null
  published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

function toServiceRecord(row: ServiceRow): ServiceRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.service_categories?.name ?? '',
    excerpt: row.excerpt ?? '',
    content: row.content ?? '',
    imageUrl: row.image_url ?? '',
    published: row.published,
    sortOrder: row.sort_order,
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at.slice(0, 10),
  }
}

async function resolveCategoryId(categoryName: string): Promise<string | null> {
  if (!categoryName) return null
  const { data } = await supabase
    .from('service_categories')
    .select('id')
    .eq('name', categoryName)
    .single()
  return (data as { id: string } | null)?.id ?? null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type ServiceInput = {
  title: string
  slug?: string
  category?: string
  excerpt?: string
  content?: string
  imageUrl?: string
  published?: boolean
  sortOrder?: number
}

export function useServices() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('services')
      .select('*, service_categories(name)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setServices((data as ServiceRow[]).map(toServiceRecord))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  const create = useCallback(async (input: ServiceInput): Promise<ServiceRecord> => {
    const categoryId = await resolveCategoryId(input.category ?? '')
    const { data, error: err } = await supabase
      .from('services')
      .insert({
        title: input.title,
        slug: input.slug || slugify(input.title),
        category_id: categoryId,
        excerpt: input.excerpt ?? '',
        content: input.content ?? '',
        image_url: input.imageUrl ?? '',
        published: input.published ?? false,
        sort_order: input.sortOrder ?? 0,
      })
      .select('*, service_categories(name)')
      .single()
    if (err) throw new Error(err.message)
    const record = toServiceRecord(data as ServiceRow)
    setServices((prev) => [...prev, record].sort((a, b) => a.sortOrder - b.sortOrder))
    return record
  }, [])

  const update = useCallback(async (id: string, input: Partial<ServiceInput>): Promise<void> => {
    const patch: Record<string, unknown> = {}
    if (input.title !== undefined) patch.title = input.title
    if (input.slug !== undefined) patch.slug = input.slug
    if (input.category !== undefined) patch.category_id = await resolveCategoryId(input.category)
    if (input.excerpt !== undefined) patch.excerpt = input.excerpt
    if (input.content !== undefined) patch.content = input.content
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl
    if (input.published !== undefined) patch.published = input.published
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

    const { data, error: err } = await supabase
      .from('services')
      .update(patch)
      .eq('id', id)
      .select('*, service_categories(name)')
      .single()
    if (err) throw new Error(err.message)
    const updated = toServiceRecord(data as ServiceRow)
    setServices((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('services').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setServices((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const reorder = useCallback(async (id: string, sortOrder: number): Promise<void> => {
    await update(id, { sortOrder })
  }, [update])

  return { services, loading, error, create, update, remove, reorder, refetch: fetchServices }
}
