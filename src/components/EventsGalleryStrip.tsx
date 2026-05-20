import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagesSquare, ArrowSquareOut } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
// ─── Types ────────────────────────────────────────────────────────────────────

type StripItem = {
  src: string
  alt: string
  mediaType: 'image' | 'album'
  href?: string
}

// ─── Data: Supabase (images + albums) ───────────────────────────────────────

function useStripItems(limit = 16) {
  const [items, setItems] = useState<StripItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('media')
      .select('bucket, path, title, alt_text, filename, media_type, thumbnail_url')
      .order('uploaded_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) console.warn('[EventsGalleryStrip]', error.message)
        if (data && data.length > 0) {
          setItems(
            data.map((row) => {
              const mediaType: 'image' | 'album' =
                row.media_type === 'album' ? 'album' : 'image'
              const alt =
                row.alt_text ?? row.title ?? row.filename ?? 'Event photo'

              if (mediaType === 'album') {
                return {
                  src: row.thumbnail_url ?? '',
                  alt,
                  mediaType: 'album' as const,
                  href: row.path,
                }
              }

              const src =
                row.bucket === 'external'
                  ? row.path
                  : supabase.storage
                      .from(row.bucket)
                      .getPublicUrl(row.path).data.publicUrl

              return { src, alt, mediaType: 'image' as const }
            }),
          )
        }
        setLoading(false)
      })
  }, [limit])

  return { items, loading }
}

// ─── Shared card base classes ─────────────────────────────────────────────────

const CARD_BASE = cn(
  'relative flex-shrink-0 w-[180px] sm:w-[220px] md:w-[260px] lg:w-[290px]',
  'rounded-2xl overflow-hidden',
  'bg-white/10 backdrop-blur-xl',
  'border border-white/25',
  'shadow-[0_4px_20px_rgba(0,0,0,0.40),0_1px_0_rgba(255,255,255,0.12)_inset]',
  'transition-all duration-300 ease-out will-change-transform',
  'hover:-translate-y-3 hover:scale-[1.04] hover:border-white/40 hover:z-10',
  'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
)

// ─── GlossyCard ───────────────────────────────────────────────────────────────

interface GlossyCardProps {
  item: StripItem
  tabIndex: number
  onFocus: () => void
}

function GlossyCard({ item, tabIndex, onFocus }: GlossyCardProps) {
  const isAlbum = item.mediaType === 'album'

  const inner = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        {item.src ? (
          <img
            src={item.src}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : isAlbum ? (
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/80 to-purple-700/80" />
        ) : null}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent pointer-events-none"
        />

        {isAlbum && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-indigo-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <ImagesSquare size={10} weight="fill" />
            Album
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 bg-black/20 backdrop-blur-sm flex items-center justify-between gap-1">
        <p className="text-white/90 text-[11px] sm:text-xs font-medium truncate leading-tight drop-shadow-sm">
          {item.alt}
        </p>
        {isAlbum && (
          <ArrowSquareOut size={12} weight="bold" className="text-white/70 shrink-0" />
        )}
      </div>

      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/55 to-transparent pointer-events-none"
      />
    </>
  )

  if (isAlbum && item.href) {
    return (
      <a
        data-strip-card
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open album: ${item.alt}`}
        tabIndex={tabIndex}
        onFocus={onFocus}
        className={cn(
          CARD_BASE,
          'block',
          'hover:shadow-[0_16px_48px_rgba(99,102,241,0.35),0_1px_0_rgba(255,255,255,0.20)_inset]',
          'focus-visible:ring-indigo-400/80',
        )}
      >
        {inner}
      </a>
    )
  }

  return (
    <article
      data-strip-card
      aria-label={item.alt}
      tabIndex={tabIndex}
      onFocus={onFocus}
      className={cn(
        CARD_BASE,
        'hover:shadow-[0_16px_48px_rgba(234,88,12,0.35),0_1px_0_rgba(255,255,255,0.20)_inset]',
        'focus-visible:ring-orange-400/80',
      )}
    >
      {inner}
    </article>
  )
}

// ─── EventsGalleryStrip ───────────────────────────────────────────────────────

export function EventsGalleryStrip() {
  const { items, loading } = useStripItems(16)
  const displayItems = items

  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // ── Kinetic / momentum drag state ──────────────────────────────────────────
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    velX: 0,
    lastX: 0,
    lastT: 0,
    rafId: 0,
  })
  // Tracks whether the current pointer interaction crossed the drag threshold.
  // Used by the capture-phase click suppressor to block unwanted navigations
  // after a drag that started on an album <a> card.
  const didDragRef = useRef(false)

  const applyMomentum = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    drag.current.velX *= 0.91
    el.scrollLeft -= drag.current.velX * 16
    if (Math.abs(drag.current.velX) > 0.05) {
      drag.current.rafId = requestAnimationFrame(applyMomentum)
    }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    // Do NOT call setPointerCapture — that would redirect the click event away
    // from <a> children (album cards) and break desktop link navigation.
    // Window-level pointerup (below) handles out-of-container releases instead.
    didDragRef.current = false
    cancelAnimationFrame(drag.current.rafId)
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      velX: 0,
      lastX: e.clientX,
      lastT: performance.now(),
      rafId: 0,
    }
    setIsPaused(true)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return
    const el = scrollRef.current
    if (!el) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) {
      e.preventDefault()
      didDragRef.current = true
    }
    el.scrollLeft = drag.current.startScroll - dx
    const now = performance.now()
    const dt = now - drag.current.lastT
    if (dt > 0) drag.current.velX = (e.clientX - drag.current.lastX) / dt
    drag.current.lastX = e.clientX
    drag.current.lastT = now
  }, [])

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return
    drag.current.active = false
    drag.current.rafId = requestAnimationFrame(applyMomentum)
  }, [applyMomentum])

  // ── Window-level pointerup: terminates drag if released outside container ──
  useEffect(() => {
    const finish = () => {
      if (!drag.current.active) return
      drag.current.active = false
      drag.current.rafId = requestAnimationFrame(applyMomentum)
    }
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [applyMomentum])

  // ── Capture-phase click suppressor: blocks navigation after a drag ─────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const suppress = (e: MouseEvent) => {
      if (didDragRef.current) {
        e.preventDefault()
        e.stopPropagation()
        didDragRef.current = false
      }
    }
    // capture: true → fires before the <a> element's own click handler
    el.addEventListener('click', suppress, { capture: true })
    return () => el.removeEventListener('click', suppress, { capture: true })
  }, [])

  // ── Active-index tracking ──────────────────────────────────────────────────
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('[data-strip-card]')
    const center = el.scrollLeft + el.clientWidth / 2
    let closest = 0
    let minDist = Infinity
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    })
    setActiveIndex(closest)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    updateScrollState()
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [updateScrollState, displayItems.length])

  // ── Scroll to a specific index ─────────────────────────────────────────────
  const scrollToCard = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>('[data-strip-card]')
    const card = cards[index]
    if (!card) return
    const target = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    setActiveIndex(index)
  }, [])

  const scrollPrev = useCallback(() => {
    scrollToCard(Math.max(0, activeIndex - 1))
    setIsPaused(true)
  }, [activeIndex, scrollToCard])

  const scrollNext = useCallback(() => {
    scrollToCard(Math.min(displayItems.length - 1, activeIndex + 1))
    setIsPaused(true)
  }, [activeIndex, displayItems.length, scrollToCard])

  // ── Autoplay ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || displayItems.length === 0) return
    const id = setInterval(() => {
      setActiveIndex((prev) => {
        const next = prev >= displayItems.length - 1 ? 0 : prev + 1
        scrollToCard(next)
        return next
      })
    }, 4000)
    return () => clearInterval(id)
  }, [isPaused, displayItems.length, scrollToCard])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext],
  )

  if (loading && items.length === 0) return null

  return (
    <section
      aria-label="Event highlights photo gallery"
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={onKeyDown}
    >
      {/* ── Scrollable card track ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        role="list"
        aria-label="Event photos — use arrow keys to navigate"
        className={cn(
          'overflow-x-auto select-none',
          'cursor-grab active:cursor-grabbing',
          '[&::-webkit-scrollbar]:hidden',
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          role="presentation"
          className="flex gap-3 sm:gap-4 px-4 sm:px-6 md:px-12 lg:px-24 pt-2 pb-4"
          style={{ width: 'max-content' }}
        >
          {displayItems.map((item, i) => (
            <div key={`${item.src}-${i}`} role="listitem">
              <GlossyCard
                item={item}
                tabIndex={0}
                onFocus={() => scrollToCard(i)}
              />
            </div>
          ))}
          <div aria-hidden="true" className="flex-shrink-0 w-4 sm:w-6 md:w-12 lg:w-20" />
        </div>
      </div>

      {/* ── Dot indicators ───────────────────────────────────────────────────── */}
      <div
        className="flex justify-center gap-1.5 pb-2 pt-1"
        role="tablist"
        aria-label="Jump to photo"
      >
        {displayItems.map((item, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`${item.mediaType === 'album' ? 'Album' : 'Photo'} ${i + 1}: ${item.alt}`}
            onClick={() => {
              scrollToCard(i)
              setIsPaused(true)
            }}
            className={cn(
              'rounded-full transition-all duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              i === activeIndex
                ? 'w-5 h-1.5 bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)]'
                : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/65',
            )}
          />
        ))}
      </div>
    </section>
  )
}
