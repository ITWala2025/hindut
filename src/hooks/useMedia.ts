import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MediaItem } from '@/lib/types'

interface MediaRow {
  id: string
  filename: string
  bucket: string
  path: string
  folder: string
  size_kb: number | null
  title: string | null
  uploaded_by: string | null
  uploaded_at: string
  alt_text: string | null
}

function toMediaItem(row: MediaRow): MediaItem {
  const isExternal = row.bucket === 'external'
  const url = isExternal
    ? row.path
    : supabase.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl
  return {
    id: row.id,
    filename: row.filename,
    url,
    folder: (row.folder as MediaItem['folder']) ?? 'general',
    sizeKb: row.size_kb ?? 0,
    uploadedBy: row.uploaded_by ?? '',
    uploadedAt: row.uploaded_at.slice(0, 10),
    title: row.title ?? row.filename,
    alt: row.alt_text ?? row.filename,
    isExternal,
  }
}

/**
 * Supabase-backed media library hook.
 * Fetches metadata from `public.media`; files are stored in Supabase Storage.
 */
export function useMedia() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('media')
      .select('*')
      .order('uploaded_at', { ascending: false })
    if (err) {
      setError(err.message)
    } else {
      setMedia((data as MediaRow[]).map(toMediaItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const upload = useCallback(
    async (file: File, folder: MediaItem['folder'], altText?: string, title?: string): Promise<MediaItem> => {
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const bucket = 'public-gallery'

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false })
      if (upErr) throw new Error(upErr.message)

      const { data: row, error: insertErr } = await supabase
        .from('media')
        .insert({
          filename: file.name,
          bucket,
          path,
          folder,
          size_kb: Math.round(file.size / 1024),
          title: title ?? file.name,
          alt_text: altText ?? file.name,
        })
        .select('*')
        .single()
      if (insertErr) {
        await supabase.storage.from(bucket).remove([path])
        throw new Error(insertErr.message)
      }

      const item = toMediaItem(row as MediaRow)
      setMedia((prev) => [item, ...prev])
      return item
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    const item = media.find((m) => m.id === id)
    if (!item) return

    const row = await supabase
      .from('media')
      .select('bucket, path')
      .eq('id', id)
      .single()

    if (!row.error && row.data) {
      const { bucket, path } = row.data as { bucket: string; path: string }
      if (bucket !== 'external') {
        await supabase.storage.from(bucket).remove([path])
      }
    }

    const { error: delErr } = await supabase.from('media').delete().eq('id', id)
    if (delErr) throw new Error(delErr.message)
    setMedia((prev) => prev.filter((m) => m.id !== id))
  }, [media])

  const update = useCallback(
    async (id: string, patch: { title?: string; alt?: string }): Promise<void> => {
      const { error: err } = await supabase
        .from('media')
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.alt !== undefined && { alt_text: patch.alt }),
        })
        .eq('id', id)
      if (err) throw new Error(err.message)
      setMedia((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                ...(patch.title !== undefined && { title: patch.title! }),
                ...(patch.alt !== undefined && { alt: patch.alt! }),
              }
            : m,
        ),
      )
    },
    [],
  )

  const addExternal = useCallback(
    async (url: string, folder: MediaItem['folder'], altText?: string, title?: string): Promise<MediaItem> => {
      const filename = url.split('/').pop()?.split('?')[0] ?? 'external-image'
      const { data: row, error: insertErr } = await supabase
        .from('media')
        .insert({
          filename,
          bucket: 'external',
          path: url,
          folder,
          size_kb: 0,
          title: title ?? filename,
          alt_text: altText ?? filename,
        })
        .select('*')
        .single()
      if (insertErr) throw new Error(insertErr.message)
      const item = toMediaItem(row as MediaRow)
      setMedia((prev) => [item, ...prev])
      return item
    },
    [],
  )

  return { media, loading, error, upload, addExternal, update, remove, refetch: fetchMedia }
}
