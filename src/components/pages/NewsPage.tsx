import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MegaphoneSimple, CalendarBlank, ArrowRight, BellRinging } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useNewsUpdates, NEWS_CATEGORY_LABELS } from '@/hooks/useNewsUpdates'
import type { NewsCategory, NewsUpdate } from '@/lib/types'
import { SeoMeta } from '@/lib/seo'

type CategoryFilter = 'all' | NewsCategory

const CATEGORY_BADGE_COLORS: Record<NewsCategory, string> = {
  announcement: 'bg-orange-100 text-orange-800 border-orange-300',
  milestone:    'bg-amber-100  text-amber-800  border-amber-300',
  initiative:   'bg-emerald-100 text-emerald-800 border-emerald-300',
  community:    'bg-blue-100   text-blue-800   border-blue-300',
}

const CATEGORY_PILL_ACTIVE: Record<NewsCategory, string> = {
  announcement: 'bg-orange-500 text-white shadow shadow-orange-200',
  milestone:    'bg-amber-500  text-white shadow shadow-amber-200',
  initiative:   'bg-emerald-500 text-white shadow shadow-emerald-200',
  community:    'bg-blue-500   text-white shadow shadow-blue-200',
}

const CATEGORY_PILL_INACTIVE: Record<NewsCategory, string> = {
  announcement: 'text-orange-700 hover:bg-orange-50 border border-orange-200',
  milestone:    'text-amber-700  hover:bg-amber-50  border border-amber-200',
  initiative:   'text-emerald-700 hover:bg-emerald-50 border border-emerald-200',
  community:    'text-blue-700   hover:bg-blue-50   border border-blue-200',
}

const CATEGORY_ACCENT: Record<NewsCategory, string> = {
  announcement: 'from-orange-400 via-amber-400   to-orange-300',
  milestone:    'from-amber-400  via-yellow-400  to-amber-300',
  initiative:   'from-emerald-400 via-teal-400   to-emerald-300',
  community:    'from-blue-400   via-sky-400     to-blue-300',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function NewsPage() {
  const navigate = useNavigate()
  const { newsUpdates, loading } = useNewsUpdates()
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const published = useMemo(
    () => newsUpdates.filter((n) => n.published),
    [newsUpdates],
  )

  const visible = useMemo(() => {
    if (filter === 'all') return published
    return published.filter((n) => n.category === filter)
  }, [published, filter])

  const categories: NewsCategory[] = ['announcement', 'milestone', 'initiative', 'community']

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#FDFAF5' }}>
      <SeoMeta
        title="News & Updates — Hindu Association of Ireland"
        description="Stay informed about the Hindu Association of Ireland's latest announcements, milestones, community initiatives, and temple progress updates."
        canonical="/news"
      />

      {/* ─── PAGE HEADER ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/30 to-white">
        {/* Top padding to clear the fixed floating header */}
        <div className="pt-[92px] md:pt-[108px]" />

        {/* Decorative blurred circles */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-[480px] h-[480px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.5) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute top-12 -left-20 w-[360px] h-[360px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.45) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-1/3 w-[280px] h-[280px] rounded-full opacity-15 blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 container mx-auto max-w-6xl px-6 pb-10 md:pb-14">
          {/* Badge chip */}
          <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-full px-4 py-1.5 mb-5">
            <BellRinging size={15} weight="duotone" className="text-orange-600" />
            <span className="text-sm font-semibold text-orange-700 tracking-wide">Latest Updates</span>
          </div>

          {/* Heading */}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-orange-900 leading-tight mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            News &amp; Updates
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mb-8">
            Stay informed about our temple's progress, initiatives, and community milestones.
          </p>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                filter === 'all'
                  ? 'bg-slate-800 text-white shadow shadow-slate-300'
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200',
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                  filter === cat
                    ? CATEGORY_PILL_ACTIVE[cat]
                    : CATEGORY_PILL_INACTIVE[cat],
                )}
              >
                {NEWS_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NEWS GRID ─── */}
      <section className="container mx-auto max-w-6xl px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
              <MegaphoneSimple size={28} className="text-orange-400" weight="duotone" />
            </div>
            <h2
              className="text-2xl font-bold text-orange-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              No updates yet
            </h2>
            <p className="text-slate-500 max-w-sm">
              {filter === 'all'
                ? 'No news updates have been published yet. Check back soon.'
                : `No ${NEWS_CATEGORY_LABELS[filter as NewsCategory]} updates at the moment.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/news/${item.slug}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function NewsCard({ item, onClick }: { item: NewsUpdate; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer rounded-2xl border border-orange-100/60 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
    >
      {/* Gradient accent bar or image */}
      {item.imageUrl ? (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      ) : (
        <div className={cn('h-1.5 bg-gradient-to-r', CATEGORY_ACCENT[item.category])} />
      )}

      <CardContent className="p-6 space-y-3">
        {/* Category badge */}
        <Badge
          variant="outline"
          className={cn('text-xs font-semibold', CATEGORY_BADGE_COLORS[item.category])}
        >
          {NEWS_CATEGORY_LABELS[item.category]}
        </Badge>

        {/* Title */}
        <h3
          className="text-lg font-semibold text-orange-900 leading-snug group-hover:text-orange-600 transition-colors line-clamp-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {item.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
          {item.excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarBlank size={12} weight="duotone" className="text-orange-400" />
            {formatDate(item.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:gap-2 transition-all">
            Read more
            <ArrowRight size={12} weight="bold" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-orange-100/60 bg-white shadow-sm overflow-hidden">
      <Skeleton className="h-1.5 w-full rounded-none" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}
