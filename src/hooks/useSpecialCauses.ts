import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SpecialCauseRow {
  id: string
  slug: string
  title: string
  description: string | null
  cover_image_url: string | null
  target_amount_eur: number | null
  deadline: string | null
  status: 'draft' | 'active' | 'paused' | 'closed'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CauseWithStats extends SpecialCauseRow {
  total_raised: number
  donor_count: number
}

export interface NewSpecialCause {
  slug: string
  title: string
  description?: string
  cover_image_url?: string
  target_amount_eur?: number | null
  deadline?: string | null
  status: SpecialCauseRow['status']
}

/** Admin hook — reads all causes (including drafts) with aggregated stats. */
export function useSpecialCauses() {
  const [causes, setCauses] = useState<CauseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCauses = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('get_causes_with_stats')
    if (err) setError(err.message)
    else setCauses((data ?? []) as CauseWithStats[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCauses() }, [fetchCauses])

  const createCause = useCallback(async (cause: NewSpecialCause) => {
    const { error: err } = await supabase.from('special_causes').insert({
      slug:               cause.slug,
      title:              cause.title,
      description:        cause.description        || null,
      cover_image_url:    cause.cover_image_url    || null,
      target_amount_eur:  cause.target_amount_eur  ?? null,
      deadline:           cause.deadline           ?? null,
      status:             cause.status,
    })
    if (err) throw new Error(err.message)
    await fetchCauses()
  }, [fetchCauses])

  const updateCause = useCallback(async (id: string, updates: Partial<NewSpecialCause>) => {
    const { error: err } = await supabase
      .from('special_causes')
      .update(updates)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetchCauses()
  }, [fetchCauses])

  const deleteCause = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('special_causes').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetchCauses()
  }, [fetchCauses])

  return { causes, loading, error, refetch: fetchCauses, createCause, updateCause, deleteCause }
}

/** Public hook — only active causes, no stats (used on /causes listing). */
export function usePublicCauses() {
  const [causes, setCauses] = useState<SpecialCauseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('special_causes')
      .select('id, slug, title, description, cover_image_url, target_amount_eur, deadline, status, created_by, created_at, updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCauses((data ?? []) as SpecialCauseRow[])
        setLoading(false)
      })
  }, [])

  return { causes, loading }
}

/** One-shot fetch for a single cause by slug (public, anon-safe). */
export async function fetchCauseBySlug(slug: string): Promise<SpecialCauseRow | null> {
  const { data } = await supabase
    .from('special_causes')
    .select('id, slug, title, description, cover_image_url, target_amount_eur, deadline, status, created_by, created_at, updated_at')
    .eq('slug', slug)
    .in('status', ['active', 'paused', 'closed'])
    .maybeSingle()
  return data as SpecialCauseRow | null
}

/** Call the anon-accessible RPC to get total raised for a cause. */
export async function fetchCauseTotalRaised(causeId: string): Promise<number> {
  const { data } = await supabase.rpc('get_cause_total_raised', { p_cause_id: causeId })
  return (data as number) ?? 0
}

/** Lightweight check — true if at least one active cause exists (anon-safe). */
export function useHasActiveCauses(): boolean {
  const [has, setHas] = useState(false)
  useEffect(() => {
    supabase
      .from('special_causes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .limit(1)
      .then(({ count }) => setHas((count ?? 0) > 0))
  }, [])
  return has
}

/** Derive a URL-safe slug from a title. */
export function slugifyCause(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80)
}
