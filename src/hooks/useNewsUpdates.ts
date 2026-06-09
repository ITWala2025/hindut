import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { NewsCategory, NewsUpdate } from '@/lib/types'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  announcement: 'Announcement',
  milestone: 'Milestone',
  initiative: 'Initiative',
  community: 'Community',
}

// Shape returned by Supabase for news_updates rows
interface NewsRow {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  image_url: string | null
  category: string
  published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

function toNewsUpdate(row: NewsRow): NewsUpdate {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    imageUrl: row.image_url,
    category: row.category as NewsCategory,
    published: row.published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Supabase-backed news store. Fetches from `public.news_updates`.
 * Anon users see only published news; authenticated admin users
 * see all via RLS bypass.
 */
export function useNewsUpdates() {
  const [newsUpdates, setNewsUpdates] = useState<NewsUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('news_updates')
      .select('*')
      .order('sort_order', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      setNewsUpdates((data as NewsRow[]).map(toNewsUpdate))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchNews() }, [fetchNews])

  const addNews = useCallback(
    async (news: Omit<NewsUpdate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      const { data, error: err } = await supabase
        .from('news_updates')
        .insert({
          slug: news.slug || slugify(news.title),
          title: news.title,
          excerpt: news.excerpt,
          content: news.content,
          image_url: news.imageUrl ?? null,
          category: news.category,
          published: news.published,
          sort_order: news.sortOrder,
        })
        .select('id')
        .single()
      if (err) throw new Error(err.message)
      await fetchNews()
      return (data as { id: string }).id
    },
    [fetchNews],
  )

  const updateNews = useCallback(
    async (id: string, patch: Partial<Omit<NewsUpdate, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const update: Record<string, unknown> = {}
      if (patch.slug !== undefined)      update.slug       = patch.slug || slugify(patch.title ?? '')
      if (patch.title !== undefined)     update.title      = patch.title
      if (patch.excerpt !== undefined)   update.excerpt    = patch.excerpt
      if (patch.content !== undefined)   update.content    = patch.content
      if ('imageUrl' in patch)           update.image_url  = patch.imageUrl ?? null
      if (patch.category !== undefined)  update.category   = patch.category
      if (patch.published !== undefined) update.published  = patch.published
      if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder
      const { error: err } = await supabase.from('news_updates').update(update).eq('id', id)
      if (err) throw new Error(err.message)
      await fetchNews()
    },
    [fetchNews],
  )

  const deleteNews = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('news_updates').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setNewsUpdates((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { newsUpdates, loading, error, addNews, updateNews, deleteNews, refetch: fetchNews }
}

/** Returns a single published news item by its slug. */
export function useNewsBySlug(slug: string | undefined) {
  const { newsUpdates, loading, error } = useNewsUpdates()
  const news = useMemo(() => {
    if (!slug) return null
    return newsUpdates.find((n) => n.slug === slug) ?? null
  }, [newsUpdates, slug])
  return { news, loading, error }
}
