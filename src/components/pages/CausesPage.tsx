import { Link } from 'react-router-dom'
import { Heart, ArrowRight, Target, Calendar } from '@phosphor-icons/react'
import { usePublicCauses, type SpecialCauseRow } from '@/hooks/useSpecialCauses'

function CauseCard({ cause }: { cause: SpecialCauseRow }) {
  const deadlineDate = cause.deadline ? new Date(cause.deadline) : null
  const isExpired    = deadlineDate ? deadlineDate < new Date() : false

  return (
    <Link
      to={`/causes/${cause.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md hover:border-orange-300 transition-all overflow-hidden"
    >
      {cause.cover_image_url ? (
        <div className="h-48 overflow-hidden">
          <img
            src={cause.cover_image_url}
            alt={cause.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-48 bg-linear-to-br from-orange-400 to-amber-500 flex items-center justify-center">
          <Heart size={48} className="text-white/40" weight="fill" />
        </div>
      )}

      <div className="flex-1 p-5 space-y-3">
        <h2
          className="font-bold text-lg text-orange-900 group-hover:text-orange-700 leading-snug line-clamp-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {cause.title}
        </h2>

        {cause.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {cause.description}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
          {cause.target_amount_eur && (
            <span className="flex items-center gap-1">
              <Target size={12} className="text-orange-400" />
              Target: €{cause.target_amount_eur.toLocaleString('en-IE')}
            </span>
          )}
          {deadlineDate && !isExpired && (
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-orange-400" />
              Deadline:{' '}
              {deadlineDate.toLocaleDateString('en-IE', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-orange-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-orange-700 group-hover:text-orange-900 transition-colors">
          Learn more &amp; Donate
        </span>
        <ArrowRight
          size={16}
          className="text-orange-500 group-hover:translate-x-1 transition-transform"
        />
      </div>
    </Link>
  )
}

export function CausesPage() {
  const { causes, loading } = usePublicCauses()

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-white">
      {/* Page header */}
      <div className="bg-linear-to-r from-orange-600 to-amber-600 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-white/20 p-4">
              <Heart size={40} weight="fill" />
            </div>
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Special Cause Campaigns
          </h1>
          <p className="text-orange-100 text-lg max-w-xl mx-auto">
            Support dedicated campaigns that make a direct impact for our community and temple.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          </div>
        ) : causes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart size={40} className="mx-auto mb-3 text-orange-200" weight="fill" />
            <p className="font-semibold text-slate-700">No active campaigns at the moment.</p>
            <p className="text-sm mt-1">Check back soon — new causes will be published here.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {causes.map((c) => (
              <CauseCard key={c.id} cause={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
