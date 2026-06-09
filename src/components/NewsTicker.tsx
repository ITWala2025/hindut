import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MegaphoneSimple, X } from '@phosphor-icons/react'
import { useNewsUpdates } from '@/hooks/useNewsUpdates'

export function NewsTicker() {
  const [dismissed, setDismissed] = useState(false)
  const { newsUpdates, loading } = useNewsUpdates()

  const published = useMemo(
    () => newsUpdates.filter((n) => n.published),
    [newsUpdates],
  )

  if (loading || dismissed || published.length === 0) return null

  // Double items for seamless infinite loop
  const doubled = [...published, ...published]

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>

      <div
        className="fixed left-0 right-0 z-40 top-[76px] md:top-[92px] h-10 flex items-stretch overflow-hidden bg-gradient-to-r from-orange-700 via-orange-600 to-amber-600 border-t border-orange-500/40 border-b border-orange-800/30"
        role="marquee"
        aria-label="Latest news"
      >
        {/* Left badge */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-orange-500/40 bg-orange-800/20 h-full text-white font-bold text-[11px] tracking-widest uppercase">
          <MegaphoneSimple size={13} weight="fill" />
          NEWS
        </div>

        {/* Reduced-motion fallback: static first item */}
        <div className="motion-reduce:flex hidden flex-1 items-center px-3 overflow-hidden">
          <Link
            to={`/news/${published[0].slug}`}
            className="text-white text-xs font-medium truncate hover:underline"
          >
            {published[0].title}
            {published[0].excerpt ? ` — ${published[0].excerpt.slice(0, 80)}${published[0].excerpt.length > 80 ? '…' : ''}` : ''}
          </Link>
          <Link
            to="/news"
            className="ml-3 shrink-0 text-white/80 text-xs font-medium hover:text-white underline"
          >
            View all news →
          </Link>
        </div>

        {/* Scrolling track (hidden when reduced-motion) */}
        <Link
          to="/news"
          className="motion-reduce:hidden flex flex-1 items-center overflow-hidden cursor-pointer"
          tabIndex={-1}
          aria-hidden="true"
        >
          <div className="ticker-track flex items-center w-max gap-0">
            {doubled.map((item, idx) => (
              <TickerItem key={`${item.id}-${idx}`} item={item} />
            ))}
          </div>
        </Link>

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 flex items-center justify-center px-3 text-white/70 hover:text-white transition-colors"
          aria-label="Dismiss news ticker"
        >
          <X size={13} />
        </button>
      </div>
    </>
  )
}

interface TickerItemProps {
  item: { id: string; slug: string; title: string; excerpt: string }
}

function TickerItem({ item }: TickerItemProps) {
  const navigate = useNavigate()
  const excerpt = item.excerpt
    ? item.excerpt.slice(0, 80) + (item.excerpt.length > 80 ? '…' : '')
    : ''

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/news/${item.slug}`)
  }

  return (
    <span className="flex items-center whitespace-nowrap text-xs font-medium text-white">
      <button
        onClick={handleClick}
        className="hover:underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 text-white text-xs font-medium whitespace-nowrap"
      >
        {item.title}
        {excerpt ? ` — ${excerpt}` : ''}
      </button>
      <span className="mx-4 text-orange-300/60 select-none">·</span>
    </span>
  )
}
