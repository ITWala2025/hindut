import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceCategory } from '@/lib/types'

interface CategoryRow {
  id: string
  name: string
  sort_order: number
}

function toCategory(row: CategoryRow): ServiceCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order }
}

export function useServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('service_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (err) setError(err.message)
    else setCategories((data as CategoryRow[]).map(toCategory))
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (name: string): Promise<ServiceCategory> => {
    const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) : 0
    const { data, error: err } = await supabase
      .from('service_categories')
      .insert({ name: name.trim(), sort_order: maxOrder + 1 })
      .select('*')
      .single()
    if (err) throw new Error(err.message)
    const cat = toCategory(data as CategoryRow)
    setCategories((prev) => [...prev, cat].sort((a, b) => a.sortOrder - b.sortOrder))
    return cat
  }, [categories])

  const rename = useCallback(async (id: string, name: string): Promise<void> => {
    const { error: err } = await supabase
      .from('service_categories')
      .update({ name: name.trim() })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)))
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const reorder = useCallback(async (id: string, sortOrder: number): Promise<void> => {
    const { error: err } = await supabase
      .from('service_categories')
      .update({ sort_order: sortOrder })
      .eq('id', id)
    if (err) throw new Error(err.message)
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, sortOrder } : c)).sort((a, b) => a.sortOrder - b.sortOrder)
    )
  }, [])

  return { categories, loading, error, create, rename, remove, reorder, refetch: fetch }
}
