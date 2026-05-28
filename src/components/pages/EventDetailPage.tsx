import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarBlank,
  MapPin,
  Clock,
  Ticket,
  ClipboardText,
  ArrowLeft,
} from '@phosphor-icons/react'
import { RsvpDialog } from '@/components/RsvpDialog'
import { TicketBookingDialog } from '@/components/TicketBookingDialog'
import { useEventBySlug } from '@/hooks/useEvents'
import { CATEGORY_LABELS, type TempleEvent } from '@/data/events'
import { SeoMeta } from '@/lib/seo'

function formatEventDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return {
    full: d.toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    short: d.toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { event, loading } = useEventBySlug(slug)
  const [rsvpOpen, setRsvpOpen]     = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [scrolled, setScrolled]     = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (loading) return <EventDetailSkeleton />

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
          <CalendarBlank size={28} className="text-orange-400" weight="duotone" />
        </div>
        <h1 className="text-2xl font-bold text-orange-900" style={{ fontFamily: 'var(--font-heading)' }}>
          Event not found
        </h1>
        <p className="text-slate-500 max-w-sm">
          This event may have been removed or the link may be incorrect.
        </p>
        <Button
          onClick={() => navigate('/events')}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-6"
        >
          Browse all events
        </Button>
      </div>
    )
  }

  const { full: fullDate } = formatEventDate(event.date)

  return (
    <div className="min-h-screen" style={{ background: '#FDFAF5' }}>
      <SeoMeta
        title={event.title}
        description={event.description.slice(0, 160)}
        canonical={`/events/${event.slug}`}
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
          to="/events"
          className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm shadow-lg border border-orange-100 rounded-full pl-3 pr-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:text-orange-900 transition-colors"
        >
          <ArrowLeft size={14} weight="bold" />
          All events
        </Link>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative w-full overflow-hidden" style={{ height: 'clamp(420px, 68vh, 680px)' }}>
        {/* Background */}
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <NoImageHero />
        )}

        {/* Gradient layers — cinematic depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Back button — top left, inside hero (fades out as fixed button fades in) */}
        <div
          className={`absolute top-6 left-6 z-10 transition-opacity duration-300 ${
            scrolled ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Link
            to="/events"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 rounded-full pl-3 pr-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            All events
          </Link>
        </div>

        {/* Title + meta — pinned to hero bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 lg:px-16 pb-10">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-5 max-w-3xl"
            style={{
              fontFamily: 'var(--font-heading)',
              textShadow: '0 2px 24px rgba(0,0,0,0.5)',
            }}
          >
            {event.title}
          </h1>

          {/* Chips row — date, time, location, category, paid/free all together */}
          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm text-white">
              <CalendarBlank size={13} weight="fill" className="text-amber-300" />
              {fullDate}
            </span>
            {event.time && (
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm text-white">
                <Clock size={13} weight="fill" className="text-amber-300" />
                {event.time}
              </span>
            )}
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm text-white">
              <MapPin size={13} weight="fill" className="text-amber-300" />
              {event.location}
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-sm text-white font-medium">
              {CATEGORY_LABELS[event.category]}
            </span>
            {event.isPaid ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-400/90 backdrop-blur-md rounded-full px-4 py-1.5 text-sm font-bold text-amber-900">
                <Ticket size={13} weight="fill" />
                {event.ticketTiers && event.ticketTiers.length > 0
                  ? `from €${Math.min(...event.ticketTiers.map((t) => t.price))}`
                  : `€${event.price ?? 0}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-orange-500/90 backdrop-blur-md rounded-full px-4 py-1.5 text-sm font-bold text-white">
                Free entry
              </span>
            )}
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

              {/* ── Left: description ── */}
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h2
                    className="text-lg font-bold text-orange-800/60 uppercase tracking-widest mb-4"
                    style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.15em' }}
                  >
                    About this event
                  </h2>
                  <div
                    className="text-slate-700 leading-relaxed whitespace-pre-line space-y-4"
                    style={{ fontSize: '1.0625rem' }}
                  >
                    {event.description || 'Details coming soon.'}
                  </div>
                </div>

                {/* Mobile CTA */}
                <div className="lg:hidden">
                  <EventCta event={event} onRsvp={() => setRsvpOpen(true)} onBookTicket={() => setTicketOpen(true)} />
                </div>
              </div>

              {/* ── Right: sticky info card ── */}
              <div className="hidden lg:block">
                <div className="sticky top-24">
                  <EventCta event={event} onRsvp={() => setRsvpOpen(true)} onBookTicket={() => setTicketOpen(true)} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {rsvpOpen && (
        <RsvpDialog open={rsvpOpen} onOpenChange={setRsvpOpen} event={event} />
      )}
      {ticketOpen && (
        <TicketBookingDialog open={ticketOpen} onOpenChange={setTicketOpen} event={event} />
      )}
    </div>
  )
}

function EventCta({
  event,
  onRsvp,
  onBookTicket,
}: {
  event: TempleEvent
  onRsvp: () => void
  onBookTicket: () => void
}) {
  const { full: fullDate } = formatEventDate(event.date)

  return (
    <div className="rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden">
      {/* Gradient accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400" />

      <div className="p-6 space-y-5">
        {/* Info rows */}
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarBlank size={15} className="text-orange-600" weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm text-slate-800 font-medium leading-snug">{fullDate}</p>
            </div>
          </li>

          {event.time && (
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={15} className="text-orange-600" weight="duotone" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Time</p>
                <p className="text-sm text-slate-800 font-medium">{event.time}</p>
              </div>
            </li>
          )}

          <li className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={15} className="text-orange-600" weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Location</p>
              <p className="text-sm text-slate-800 font-medium">{event.location}</p>
            </div>
          </li>
        </ul>

        {/* Divider */}
        <div className="border-t border-orange-50" />

        {/* CTA */}
        {event.isPaid ? (
          <div className="space-y-2">
            <Button
              onClick={onBookTicket}
              size="lg"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-sm shadow-orange-200 rounded-xl"
            >
              <Ticket className="mr-2" weight="fill" size={16} />
              {event.ticketTiers && event.ticketTiers.length > 0
                ? `Book tickets — from €${Math.min(...event.ticketTiers.map((t) => t.price))}`
                : `Book ticket — €${event.price ?? 0}`}
            </Button>
            <p className="text-center text-xs text-slate-400">Secure payment via Stripe</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={onRsvp}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold shadow-sm shadow-orange-200 rounded-xl"
            >
              <ClipboardText className="mr-2" weight="fill" size={16} />
              RSVP — Free entry
            </Button>
            <p className="text-center text-xs text-slate-400">Let us know you're coming</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NoImageHero() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse at 30% 60%, rgba(251,146,60,0.45) 0%, transparent 55%), ' +
          'radial-gradient(ellipse at 75% 30%, rgba(217,119,6,0.35) 0%, transparent 50%), ' +
          'linear-gradient(135deg, #9a3412 0%, #b45309 50%, #92400e 100%)',
      }}
    >
      {/* Decorative concentric rings */}
      {[340, 240, 160, 90].map((size, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8"
          style={{ width: size, height: size, opacity: 0.18 - i * 0.03 }}
        />
      ))}
      {/* Central Om-inspired glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-amber-400/20 blur-xl" />
    </div>
  )
}

function EventDetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#FDFAF5' }}>
      <Skeleton className="w-full rounded-none" style={{ height: 'clamp(420px, 68vh, 680px)' }} />
      <div className="relative -mt-6 z-10 rounded-t-3xl pt-10 pb-20" style={{ background: '#FDFAF5' }}>
        <div className="container mx-auto max-w-5xl px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="hidden lg:block">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
