import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Heart,
  Calendar,
  Target,
  ShareNetwork,
  ArrowLeft,
  CheckCircle,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CauseDonationDialog } from '@/components/CauseDonationDialog'
import {
  fetchCauseBySlug,
  fetchCauseTotalRaised,
  type SpecialCauseRow,
} from '@/hooks/useSpecialCauses'
import { cn } from '@/lib/utils'

function ProgressBar({ raised, target }: { raised: number; target: number | null }) {
  if (!target) return null
  const percent = Math.min(100, Math.round((raised / target) * 100))
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-orange-800">
          €{raised.toLocaleString('en-IE', { minimumFractionDigits: 2 })} raised
        </span>
        <span className="text-muted-foreground">
          of €{target.toLocaleString('en-IE', { minimumFractionDigits: 2 })} goal
        </span>
      </div>
      <div className="h-3 rounded-full bg-orange-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">{percent}% of goal reached</div>
    </div>
  )
}

function StatusBadge({ status }: { status: SpecialCauseRow['status'] }) {
  const map: Record<SpecialCauseRow['status'], { cls: string; label: string }> = {
    active: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Active'  },
    paused: { cls: 'bg-amber-100 text-amber-800 border-amber-200',       label: 'Paused'  },
    closed: { cls: 'bg-slate-100 text-slate-700 border-slate-200',       label: 'Closed'  },
    draft:  { cls: 'bg-slate-100 text-slate-700 border-slate-200',       label: 'Draft'   },
  }
  const { cls, label } = map[status]
  return <Badge className={cn('border', cls)}>{label}</Badge>
}

export function CauseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [cause, setCause]           = useState<SpecialCauseRow | null>(null)
  const [totalRaised, setTotalRaised] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [donateOpen, setDonateOpen] = useState(false)
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    if (!slug) return
    fetchCauseBySlug(slug).then((c) => {
      setCause(c)
      if (c) fetchCauseTotalRaised(c.id).then(setTotalRaised)
      setLoading(false)
    })
  }, [slug])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    )
  }

  if (!cause) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Heart size={48} className="mx-auto mb-4 text-orange-200" weight="fill" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Campaign not found</h1>
        <p className="text-muted-foreground mb-6">
          This donation campaign may have ended or the link is incorrect.
        </p>
        <Link to="/causes">
          <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            <ArrowLeft size={16} className="mr-2" /> View all campaigns
          </Button>
        </Link>
      </div>
    )
  }

  const canDonate  = cause.status === 'active'
  const isClosed   = cause.status === 'closed'
  const isPaused   = cause.status === 'paused'
  const deadlineDate = cause.deadline ? new Date(cause.deadline) : null
  const isExpired    = deadlineDate ? deadlineDate < new Date() : false

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-white">
      {/* Hero image */}
      {cause.cover_image_url ? (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={cause.cover_image_url}
            alt={cause.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="h-48 bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center">
          <Heart size={64} className="text-white/30" weight="fill" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link
          to="/causes"
          className="inline-flex items-center gap-1.5 text-sm text-orange-700 hover:text-orange-900 hover:underline"
        >
          <ArrowLeft size={15} /> All campaigns
        </Link>

        {/* Title & status */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1
              className="text-3xl md:text-4xl font-bold text-orange-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {cause.title}
            </h1>
            <StatusBadge status={cause.status} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {deadlineDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={15} className="text-orange-500" />
                {isExpired ? 'Ended ' : 'Deadline: '}
                {deadlineDate.toLocaleDateString('en-IE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
            )}
            {cause.target_amount_eur && (
              <span className="flex items-center gap-1.5">
                <Target size={15} className="text-orange-500" />
                Target: €{cause.target_amount_eur.toLocaleString('en-IE')}
              </span>
            )}
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm space-y-4">
          {cause.target_amount_eur ? (
            <ProgressBar raised={totalRaised} target={cause.target_amount_eur} />
          ) : (
            <div className="text-lg font-semibold text-orange-800">
              €{totalRaised.toLocaleString('en-IE', { minimumFractionDigits: 2 })} raised so far
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {canDonate && !isExpired ? (
              <Button
                onClick={() => setDonateOpen(true)}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold px-6 h-11 hover-glow-saffron"
              >
                <Heart size={18} className="mr-2" weight="fill" />
                Donate to this Cause
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
                {isClosed || isExpired ? (
                  <><CheckCircle size={16} className="text-emerald-600" weight="fill" /> This campaign has closed</>
                ) : isPaused ? (
                  <><span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" /> Donations temporarily paused</>
                ) : null}
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleShare}
              className="border-orange-300 text-orange-700 hover:bg-orange-50 h-11"
            >
              {copied ? (
                <><CheckCircle size={16} className="mr-1.5 text-emerald-600" weight="fill" />Copied!</>
              ) : (
                <><ShareNetwork size={16} className="mr-1.5" />Share</>
              )}
            </Button>
          </div>
        </div>

        {/* Description */}
        {cause.description && (
          <div className="space-y-3">
            <h2
              className="text-xl font-bold text-orange-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              About this cause
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {cause.description}
            </p>
          </div>
        )}
      </div>

      {/* Donation dialog (only mounted when donations are open) */}
      {canDonate && !isExpired && (
        <CauseDonationDialog
          open={donateOpen}
          onOpenChange={setDonateOpen}
          cause={{ id: cause.id, title: cause.title, description: cause.description, slug: cause.slug }}
        />
      )}
    </div>
  )
}
