import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { CalendarBlank, MapPin, Clock, Ticket, Heart, ArrowDown, ClipboardText, Image as ImageIcon } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { RsvpDialog } from '@/components/RsvpDialog'
import { TicketBookingDialog } from '@/components/TicketBookingDialog'
import { cn } from '@/lib/utils'
import { useEvents, sortByDate, upcomingOnly } from '@/hooks/useEvents'
import { CATEGORY_LABELS, type EventCategory, type TempleEvent } from '@/data/events'

type Filter = 'all' | 'free' | 'paid'

function formatEventDate(iso: string): { month: string; day: string; full: string } {
  const d = new Date(iso + 'T00:00:00')
  const month = d.toLocaleString('en-IE', { month: 'short' }).toUpperCase()
  const day = String(d.getDate()).padStart(2, '0')
  const full = d.toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return { month, day, full }
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  festival: 'bg-amber-100 text-amber-800 border-amber-300',
  prayer: 'bg-orange-100 text-orange-800 border-orange-300',
  celebration: 'bg-pink-100 text-pink-800 border-pink-300',
  community: 'bg-blue-100 text-blue-800 border-blue-300',
  cultural: 'bg-purple-100 text-purple-800 border-purple-300',
}

export function EventsPage() {
  const navigate = useNavigate()
  const { events } = useEvents()
  const [filter, setFilter] = useState<Filter>('all')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [rsvpEvent, setRsvpEvent] = useState<TempleEvent | null>(null)
  const [ticketEvent, setTicketEvent] = useState<TempleEvent | null>(null)
  const [detailEvent, setDetailEvent] = useState<TempleEvent | null>(null)

  const visible = useMemo(() => {
    const sorted = sortByDate(events.filter((e) => e.published))
    if (filter === 'free') return sorted.filter((e) => !e.isPaid)
    if (filter === 'paid') return sorted.filter((e) => e.isPaid)
    return sorted
  }, [events, filter])

  const upcoming = useMemo(() => upcomingOnly(events), [events])
  /** Pills surface up to 4 nearest celebrations so the hero can jump
   *  visitors straight to a specific event card. */
  const heroPills = useMemo(() => upcoming.slice(0, 4), [upcoming])

  const scrollToEvent = (eventId: string) => {
    // If filtering would hide the target, reset so the card actually renders.
    setFilter('all')
    // Run scroll in a microtask so the DOM re-renders first.
    window.setTimeout(() => {
      const el = document.getElementById(`event-${eventId}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedId(eventId)
      window.setTimeout(
        () => setHighlightedId((cur) => (cur === eventId ? null : cur)),
        1800,
      )
    }, 60)
  }

  return (
    <div className="flex flex-col">
      <HeroCarousel
        title="Temple Events & Calendar"
        subtitle={`${upcoming.length} upcoming celebrations across Ahane, Pallaskenry and Mungret`}
      >
        {/* Quick-jump pills: tap a celebration to scroll straight to its
            card below and briefly highlight it. */}
        {heroPills.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-3">
              {heroPills.map((event) => {
                const { month, day } = formatEventDate(event.date)
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => scrollToEvent(event.id)}
                    className="group inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 hover:shadow-lg"
                    aria-label={`Scroll to ${event.title}`}
                  >
                    <span className="text-white/80">{month} {day}</span>
                    <span className="text-white/60">•</span>
                    <span className="max-w-[160px] truncate">{event.title}</span>
                    <ArrowDown
                      size={14}
                      weight="bold"
                      className="transition-transform group-hover:translate-y-0.5"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </HeroCarousel>

      <section className="py-8 md:py-12 bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-50">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <h2
                className="text-3xl md:text-4xl font-bold text-orange-800"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Upcoming Events
              </h2>
              <p className="text-muted-foreground mt-2">
                All events are organised by the Hindu Association of Ireland (HAI).
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-orange-200 bg-white p-1 shadow-sm">
              {(['all', 'free', 'paid'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' +
                    (filter === f
                      ? 'bg-linear-to-r from-orange-600 to-amber-600 text-white shadow'
                      : 'text-orange-700 hover:bg-orange-50')
                  }
                >
                  {f === 'all' ? 'All' : f === 'free' ? 'Free entry' : 'Ticketed'}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <Card className="border-orange-200/60 bg-white/80">
              <CardContent className="p-12 text-center text-muted-foreground">
                No events match this filter yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visible.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onBookTicket={() => setTicketEvent(event)}
                  onRsvp={() => setRsvpEvent(event)}
                  onViewDetails={() => setDetailEvent(event)}
                  highlighted={highlightedId === event.id}
                />
              ))}
            </div>
          )}

          {rsvpEvent && (
            <RsvpDialog
              open={!!rsvpEvent}
              onOpenChange={(v) => { if (!v) setRsvpEvent(null) }}
              event={rsvpEvent}
            />
          )}

          {ticketEvent && (
            <TicketBookingDialog
              open={!!ticketEvent}
              onOpenChange={(v) => { if (!v) setTicketEvent(null) }}
              event={ticketEvent}
            />
          )}

          {/* Event detail sheet */}
          <Sheet open={!!detailEvent} onOpenChange={(v) => { if (!v) setDetailEvent(null) }}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
              {detailEvent && (
                <EventDetailPanel
                  event={detailEvent}
                  onRsvp={() => { setDetailEvent(null); setRsvpEvent(detailEvent) }}
                  onBookTicket={() => { setDetailEvent(null); setTicketEvent(detailEvent) }}
                />
              )}
            </SheetContent>
          </Sheet>

          <div className="mt-12 rounded-2xl bg-secondary p-8 md:p-12 text-center text-secondary-foreground shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,196,140,0.15),transparent_70%)]" />
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Want to volunteer at our events?
              </h3>
              <p className="text-secondary-foreground/90 max-w-2xl mx-auto mb-6">
                Volunteers help us host every single celebration — from cooking prasad to
                setting up audio. Reach out and we will match you to an event near you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate('/contact')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Contact the team
                </Button>
                <Button
                  onClick={() => navigate('/membership')}
                  variant="outline"
                  className="border-secondary-foreground/40 bg-transparent text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary font-semibold"
                >
                  <Heart className="mr-2" weight="fill" />
                  Become a member
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function EventCard({
  event,
  onBookTicket,
  onRsvp,
  onViewDetails,
  highlighted = false,
}: {
  event: TempleEvent
  onBookTicket: () => void
  onRsvp: () => void
  onViewDetails: () => void
  highlighted?: boolean
}) {
  const { month, day, full } = formatEventDate(event.date)

  return (
    <Card
      id={`event-${event.id}`}
      className={cn(
        'group scroll-mt-32 border-orange-200/60 bg-white/85 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden',
        highlighted && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron',
      )}
    >
      {/* Clickable image / header area */}
      <button
        type="button"
        onClick={onViewDetails}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        aria-label={`View details for ${event.title}`}
      >
        {event.image ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <div className="h-2 bg-linear-to-r from-orange-400 to-amber-400" />
        )}
      </button>

      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center justify-center bg-linear-to-br from-orange-100 to-amber-100 rounded-xl p-3 min-w-[72px] glow-saffron">
            <span className="text-xs font-semibold text-orange-700 tracking-widest">
              {month}
            </span>
            <span className="text-3xl font-bold text-orange-800 leading-none">{day}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className={CATEGORY_COLORS[event.category]}>
                {CATEGORY_LABELS[event.category]}
              </Badge>
              {event.isPaid ? (
                <Badge className="bg-amber-500 text-white">€{event.price ?? 0}</Badge>
              ) : (
                <Badge className="bg-orange-600 text-white">Free</Badge>
              )}
            </div>
            <button
              type="button"
              onClick={onViewDetails}
              className="text-left focus:outline-none"
            >
              <h3
                className="text-lg font-bold text-orange-800 leading-snug hover:underline"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {event.title}
              </h3>
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{event.description}</p>

        <ul className="space-y-1.5 text-sm text-orange-800">
          <li className="flex items-start gap-2">
            <CalendarBlank size={16} className="mt-0.5 text-orange-600" weight="duotone" />
            <span>{full}</span>
          </li>
          {event.time && (
            <li className="flex items-start gap-2">
              <Clock size={16} className="mt-0.5 text-orange-600" weight="duotone" />
              <span>{event.time}</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 text-orange-600" weight="duotone" />
            <span>{event.location}</span>
          </li>
        </ul>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onViewDetails}
            className="text-sm font-medium text-orange-700 hover:text-orange-900 hover:underline text-left"
          >
            View full details →
          </button>
          {event.isPaid ? (
            <Button
              onClick={onBookTicket}
              className="w-full bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 font-semibold"
            >
              <Ticket className="mr-2" weight="fill" />
              Book ticket
            </Button>
          ) : (
            <Button
              className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              onClick={onRsvp}
            >
              <ClipboardText className="mr-2" weight="fill" />
              RSVP
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EventDetailPanel({
  event,
  onRsvp,
  onBookTicket,
}: {
  event: TempleEvent
  onRsvp: () => void
  onBookTicket: () => void
}) {
  const { full } = formatEventDate(event.date)

  return (
    <div className="flex flex-col h-full">
      {/* Image */}
      {event.image ? (
        <div className="relative h-56 shrink-0 overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="h-20 bg-linear-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0">
          <ImageIcon size={40} className="text-white/60" weight="duotone" />
        </div>
      )}

      <div className="p-6 space-y-5 flex-1 overflow-y-auto">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className={CATEGORY_COLORS[event.category]}>
              {CATEGORY_LABELS[event.category]}
            </Badge>
            {event.isPaid ? (
              <Badge className="bg-amber-500 text-white">€{event.price ?? 0}</Badge>
            ) : (
              <Badge className="bg-orange-600 text-white">Free entry</Badge>
            )}
          </div>
          <SheetTitle
            className="text-2xl text-orange-800 leading-snug"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {event.title}
          </SheetTitle>
          <SheetDescription asChild>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {event.description}
            </p>
          </SheetDescription>
        </SheetHeader>

        <ul className="space-y-3 text-sm text-orange-800 border-t border-orange-100 pt-4">
          <li className="flex items-start gap-3">
            <CalendarBlank size={18} className="mt-0.5 text-orange-500 shrink-0" weight="duotone" />
            <span>{full}</span>
          </li>
          {event.time && (
            <li className="flex items-start gap-3">
              <Clock size={18} className="mt-0.5 text-orange-500 shrink-0" weight="duotone" />
              <span>{event.time}</span>
            </li>
          )}
          <li className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 text-orange-500 shrink-0" weight="duotone" />
            <span>{event.location}</span>
          </li>
        </ul>

        <div className="pt-2">
          {event.isPaid ? (
            <Button
              onClick={onBookTicket}
              className="w-full bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 font-semibold"
            >
              <Ticket className="mr-2" weight="fill" />
              Book ticket
            </Button>
          ) : (
            <Button
              className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              onClick={onRsvp}
            >
              <ClipboardText className="mr-2" weight="fill" />
              RSVP for this event
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
