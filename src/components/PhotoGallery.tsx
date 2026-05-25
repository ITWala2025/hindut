import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, CaretLeft, CaretRight, ImagesSquare, ArrowSquareOut } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'

type GalleryItem = {
  src: string
  alt: string
  mediaType: 'image' | 'album'
  href?: string // external URL for albums
}

function useGalleryItems(limit: number) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('media')
      .select('bucket, path, title, alt_text, filename, media_type, thumbnail_url')
      .order('uploaded_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) console.error('[PhotoGallery] fetch error:', error.message)
        if (data && data.length > 0) {
          setItems(
            data.map((row) => {
              const mediaType: 'image' | 'album' = row.media_type ?? 'image'
              const label = row.alt_text ?? row.title ?? row.filename ?? 'Gallery image'
              if (mediaType === 'album') {
                const thumbSrc =
                  row.thumbnail_url ??
                  (row.bucket && row.bucket !== 'external'
                    ? supabase.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl
                    : '')
                return { src: thumbSrc, alt: label, mediaType: 'album' as const, href: row.path }
              }
              const isExternal = row.bucket === 'external'
              const src = isExternal
                ? row.path
                : supabase.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl
              return { src, alt: label, mediaType: 'image' as const }
            })
          )
        }
        setLoading(false)
      })
  }, [limit])

  return { items, loading }
}

interface PhotoGalleryProps {
  /** Optional max number of images to show on the home page; the rest open in a lightbox. */
  preview?: number
  title?: string
  subtitle?: string
}

export function PhotoGallery({
  preview = 9,
  title = 'Moments from our Community',
  subtitle = 'Festivals, prayers and gatherings — a glimpse of life at HAI',
}: PhotoGalleryProps) {
  const { items, loading } = useGalleryItems(preview)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Only images participate in the lightbox; albums open externally
  const lightboxImages = useMemo(() => items.filter((i) => i.mediaType === 'image'), [items])

  const close = useCallback(() => setActiveIndex(null), [])
  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i - 1 + lightboxImages.length) % lightboxImages.length)),
    [lightboxImages.length],
  )
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % lightboxImages.length)),
    [lightboxImages.length],
  )

  useEffect(() => {
    if (activeIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [activeIndex, close, prev, next])

  if (loading) {
    return (
      <section className="py-16 flex justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-orange-300 border-t-orange-600 animate-spin" />
      </section>
    )
  }

  if (items.length === 0) {
    return null
  }

  const active = activeIndex !== null ? lightboxImages[activeIndex] : null

  return (
    <section
      id="gallery-section"
      className="relative pt-10 pb-12 md:pt-14 md:pb-16 bg-linear-to-b from-orange-50/40 via-white to-amber-50/40 overflow-hidden"
      aria-labelledby="gallery-heading"
    >
      {/* decorative blobs */}
      <div aria-hidden="true" className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />

      <div className="container mx-auto px-6 md:px-12 lg:px-24 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-[0.15em] mb-4">
            <ImagesSquare size={16} weight="duotone" />
            Photo Gallery
          </div>
          <h2 id="gallery-heading" className="text-3xl md:text-5xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 text-base md:text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {items.map((item) => {
            if (item.mediaType === 'album') {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl shadow-md hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500"
                  aria-label={`Open album: ${item.alt}`}
                >
                  <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600">
                    {item.src && (
                      <img
                        src={item.src}
                        alt={item.alt}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between">
                      <span className="text-white text-sm font-medium truncate pr-2 drop-shadow">{item.alt}</span>
                      <ArrowSquareOut size={18} weight="bold" className="text-white/80 shrink-0" />
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-indigo-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      <ImagesSquare size={12} weight="fill" />
                      Album
                    </div>
                  </div>
                </a>
              )
            }
            const lbIndex = lightboxImages.indexOf(item)
            return (
              <button
                key={item.src}
                type="button"
                onClick={() => setActiveIndex(lbIndex)}
                className="group relative aspect-4/3 overflow-hidden rounded-2xl shadow-md hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400"
                aria-label={`Open image: ${item.alt}`}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* Lightbox */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              close()
            }}
            className="absolute top-4 right-4 md:top-6 md:right-6 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400"
            aria-label="Close gallery"
          >
            <X size={22} weight="bold" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400"
            aria-label="Previous image"
          >
            <CaretLeft size={24} weight="bold" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400"
            aria-label="Next image"
          >
            <CaretRight size={24} weight="bold" />
          </button>

          <figure
            className="max-w-6xl max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.src}
              alt={active.alt}

              className="max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
            <figcaption className="mt-4 text-white/80 text-sm text-center capitalize">
              {active.alt} · {(activeIndex ?? 0) + 1} / {lightboxImages.length}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}
