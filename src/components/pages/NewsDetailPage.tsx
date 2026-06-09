import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  CalendarBlank,
  MegaphoneSimple,
  ShareNetwork,
} from '@phosphor-icons/react'
import { useNewsBySlug, NEWS_CATEGORY_LABELS } from '@/hooks/useNewsUpdates'
import type { NewsCategory } from '@/lib/types'
import { SeoMeta } from '@/lib/seo'

const CATEGORY_BADGE_COLORS: Record<NewsCategory, string> = {
  announcement: 'bg-orange-100 text-orange-800 border-orange-300',
  milestone:    'bg-amber-100  text-amber-800  border-amber-300',
  initiative:   'bg-emerald-100 text-emerald-800 border-emerald-300',
  community:    'bg-blue-100   text-blue-800   border-blue-300',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { news, loading } = useNewsBySlug(slug)
  const [scrolled, setScrolled] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: news?.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (loading) return <NewsDetailSkeleton />

  if (!news) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
          <MegaphoneSimple size={28} className="text-orange-400" weight="duotone" />
        </div>
        <h1
          className="text-2xl font-bold text-orange-900"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Update not found
        </h1>
        <p className="text-slate-500 max-w-sm">
          This news update may have been removed or the link may be incorrect.
        </p>
        <Button
          onClick={() => navigate('/news')}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-6"
        >
          Browse all updates
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FDFAF5' }}>
      <SeoMeta
        title={news.title}
        description={news.excerpt.slice(0, 160)}
        canonical={`/news/${news.slug}`}
        ogImage={news.imageUrl ?? undefined}
      />

      {/* ─── Floating back button — appears after scrolling past hero ─── */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out ${
          scrolled
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{ top: '76px', left: '16px' }}
      >
        <Link
          to="/news"
          className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm shadow-lg border border-orange-100 rounded-full pl-3 pr-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:text-orange-900 transition-colors"
        >
          <ArrowLeft size={14} weight="bold" />
          All updates
        </Link>
      </div>

      {/* ─── HERO ─── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(320px, 50vh, 560px)' }}
      >
        {/* Background */}
        {news.imageUrl ? (
          <img
            src={news.imageUrl}
            alt={news.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <NewsNoImageHero category={news.category} />
        )}

        {/* Gradient overlay layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Back button — top left, inside hero */}
        <div
          className={`absolute top-6 left-6 z-10 transition-opacity duration-300 ${
            scrolled ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Link
            to="/news"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 rounded-full pl-3 pr-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            All updates
          </Link>
        </div>

        {/* Title + meta — pinned to hero bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 lg:px-16 pb-10">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4 max-w-3xl"
            style={{
              fontFamily: 'var(--font-heading)',
              textShadow: '0 2px 24px rgba(0,0,0,0.5)',
            }}
          >
            {news.title}
          </h1>

          {/* Chips row */}
          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-white">
              {NEWS_CATEGORY_LABELS[news.category]}
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm text-white">
              <CalendarBlank size={13} weight="fill" className="text-amber-300" />
              {formatDate(news.createdAt)}
            </span>
          </div>
        </div>
      </section>

      {/* ─── CONTENT — overlaps hero bottom ─── */}
      <div className="relative -mt-6 z-10">
        <div
          className="rounded-t-3xl pt-10 pb-20"
          style={{ background: '#FDFAF5' }}
        >
          <div className="container mx-auto max-w-5xl px-6 md:px-10 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

              {/* ── Left: article content ── */}
              <div className="lg:col-span-2 space-y-8">
                {/* Excerpt / lead */}
                {news.excerpt && (
                  <p className="text-lg font-medium text-slate-700 leading-relaxed border-l-4 border-orange-300 pl-4">
                    {news.excerpt}
                  </p>
                )}

                {/* Rich text content */}
                <div
                  className="leading-relaxed text-slate-700 space-y-4
                    [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-orange-900 [&_h2]:mt-6 [&_h2]:mb-2
                    [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:text-orange-800 [&_h3]:mt-4 [&_h3]:mb-1
                    [&_p]:leading-relaxed [&_p]:text-slate-700
                    [&_a]:text-orange-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-orange-800
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
                    [&_li]:text-slate-700
                    [&_strong]:font-semibold [&_strong]:text-slate-800
                    [&_blockquote]:border-l-4 [&_blockquote]:border-orange-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600
                    [&_img]:rounded-xl [&_img]:w-full [&_img]:object-cover"
                  style={{ fontSize: '1.0625rem' }}
                  dangerouslySetInnerHTML={{ __html: news.content }}
                />

                {/* Mobile info card */}
                <div className="lg:hidden">
                  <NewsInfoCard
                    category={news.category}
                    date={news.createdAt}
                    onShare={handleShare}
                    copied={copied}
                  />
                </div>
              </div>

              {/* ── Right: sticky info card ── */}
              <div className="hidden lg:block">
                <div className="sticky top-24">
                  <NewsInfoCard
                    category={news.category}
                    date={news.createdAt}
                    onShare={handleShare}
                    copied={copied}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewsInfoCard({
  category,
  date,
  onShare,
  copied,
}: {
  category: NewsCategory
  date: string
  onShare: () => void
  copied: boolean
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden">
      {/* Gradient accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400" />

      <div className="p-6 space-y-5">
        <ul className="space-y-4">
          {/* Category */}
          <li className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <MegaphoneSimple size={15} className="text-orange-600" weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">
                Category
              </p>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${CATEGORY_BADGE_COLORS[category]}`}
              >
                {NEWS_CATEGORY_LABELS[category]}
              </Badge>
            </div>
          </li>

          {/* Date */}
          <li className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarBlank size={15} className="text-orange-600" weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">
                Published
              </p>
              <p className="text-sm text-slate-800 font-medium leading-snug">
                {formatDate(date)}
              </p>
            </div>
          </li>
        </ul>

        {/* Divider */}
        <div className="border-t border-orange-50" />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={onShare}
            size="lg"
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold shadow-sm shadow-orange-200 rounded-xl"
          >
            <ShareNetwork className="mr-2" weight="fill" size={16} />
            {copied ? 'Link copied!' : 'Share update'}
          </Button>

          <Link
            to="/news"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-orange-200 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            All updates
          </Link>
        </div>
      </div>
    </div>
  )
}

function NewsNoImageHero({ category }: { category: NewsCategory }) {
  const gradients: Record<NewsCategory, string> = {
    announcement:
      'radial-gradient(ellipse at 30% 60%, rgba(251,146,60,0.45) 0%, transparent 55%), ' +
      'radial-gradient(ellipse at 75% 30%, rgba(217,119,6,0.35) 0%, transparent 50%), ' +
      'linear-gradient(135deg, #9a3412 0%, #c2410c 50%, #b45309 100%)',
    milestone:
      'radial-gradient(ellipse at 30% 60%, rgba(251,191,36,0.45) 0%, transparent 55%), ' +
      'radial-gradient(ellipse at 75% 30%, rgba(245,158,11,0.35) 0%, transparent 50%), ' +
      'linear-gradient(135deg, #78350f 0%, #b45309 50%, #92400e 100%)',
    initiative:
      'radial-gradient(ellipse at 30% 60%, rgba(52,211,153,0.35) 0%, transparent 55%), ' +
      'radial-gradient(ellipse at 75% 30%, rgba(16,185,129,0.3) 0%, transparent 50%), ' +
      'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    community:
      'radial-gradient(ellipse at 30% 60%, rgba(96,165,250,0.35) 0%, transparent 55%), ' +
      'radial-gradient(ellipse at 75% 30%, rgba(59,130,246,0.3) 0%, transparent 50%), ' +
      'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #1e40af 100%)',
  }

  return (
    <div
      className="absolute inset-0"
      style={{ background: gradients[category] }}
    >
      {/* Decorative concentric rings */}
      {[340, 240, 160, 90].map((size, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8"
          style={{ width: size, height: size, opacity: 0.18 - i * 0.03 }}
        />
      ))}
      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-amber-400/20 blur-xl" />
    </div>
  )
}

function NewsDetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#FDFAF5' }}>
      <Skeleton
        className="w-full rounded-none"
        style={{ height: 'clamp(320px, 50vh, 560px)' }}
      />
      <div
        className="relative -mt-6 z-10 rounded-t-3xl pt-10 pb-20"
        style={{ background: '#FDFAF5' }}
      >
        <div className="container mx-auto max-w-5xl px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-5">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="hidden lg:block">
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
