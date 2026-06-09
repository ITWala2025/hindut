import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Heart, CalendarBlank, Users, HandsPraying, SpeakerHigh, SpeakerSlash, ArrowRight, MapPin, Clock, Sparkle, Sun, BookOpen, MusicNote, Mosque } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { CircularText } from '@/components/CircularText'
import { PhotoGallery } from '@/components/PhotoGallery'
import { SeoMeta } from '@/lib/seo'
import { useEvents, upcomingOnly } from '@/hooks/useEvents'
import { useServices } from '@/hooks/useServices'

function serviceIcon(category: string, title: string): typeof HandsPraying {
  const key = (category + ' ' + title).toLowerCase()
  if (key.includes('prayer') || key.includes('puja') || key.includes('aarti') || key.includes('worship')) return HandsPraying
  if (key.includes('festival') || key.includes('celebration') || key.includes('diwali') || key.includes('holi')) return CalendarBlank
  if (key.includes('yoga') || key.includes('meditation') || key.includes('wellness')) return Sun
  if (key.includes('class') || key.includes('education') || key.includes('sanskrit') || key.includes('learn') || key.includes('study')) return BookOpen
  if (key.includes('bhajan') || key.includes('music') || key.includes('kirtan') || key.includes('cultural')) return MusicNote
  if (key.includes('community') || key.includes('program') || key.includes('outreach')) return Users
  return Mosque
}

interface HomePageProps {
  onDonateClick: () => void
}

export function HomePage({ onDonateClick }: HomePageProps) {
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [audioAvailable, setAudioAvailable] = useState(false)

  useEffect(() => {
    // Auto-play background music when component mounts
    if (audioRef.current && !hasInteracted) {
      audioRef.current.volume = 0.5 // Set volume to 50% for better audibility

      // Try to play immediately
      const playPromise = audioRef.current.play()

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Autoplay started successfully
            setIsPlaying(true)
            setHasInteracted(true)
            console.log('Background music playing automatically')
          })
          .catch((error) => {
            // Autoplay was prevented by browser - this is normal
            console.log('Autoplay prevented by browser. Click the button to play:', error)
            setIsPlaying(false)
            // Don't set hasInteracted here, so user can still click button
          })
      }
    }

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        const playPromise = audioRef.current.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true)
              setHasInteracted(true)
              console.log('Background music playing (user started)')
            })
            .catch((error) => {
              console.error('Error playing audio:', error)
              setIsPlaying(false)
            })
        }
      }
    }
  }
  const { events } = useEvents()
  const { services: rawServices } = useServices()
  const upcomingEvents = useMemo(() => upcomingOnly(events).filter(e => e.published).slice(0, 3), [events])
  const services = useMemo(() => rawServices.filter(s => s.published).slice(0, 3), [rawServices])

  return (
    <div className="flex flex-col relative">
      <SeoMeta
        title="Hindu Temple Limerick — Home"
        description="The Hindu Association of Ireland is building a permanent Hindu Temple in Limerick. Join our community for prayer, festivals, yoga, cultural events and membership."
        canonical="/"
      />
      {/* Background Music - Krishna Bhajan */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        src="/krishna-bhajan.m4a"
        onError={() => setAudioAvailable(false)}
        onLoadedData={() => setAudioAvailable(true)}
      />

      {/* Audio Control Button — only shown when the audio file loads successfully */}
      {audioAvailable && <button
        onClick={toggleAudio}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110 glow-saffron flex items-center justify-center"
        aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
        title={isPlaying ? 'Pause background music' : 'Play background music'}
      >
        {isPlaying ? (
          <SpeakerHigh size={24} weight="fill" />
        ) : (
          <SpeakerSlash size={24} weight="fill" />
        )}
      </button>}

      <HeroCarousel
        title="Welcome to the Hindu Association of Ireland"
        subtitle="A united platform working to establish a permanent Hindu Cultural Center in Limerick. Join us in prayer, celebration and community."
        enableRevealAnimation={true}
      >
        <div className="inline-block mb-8 mt-8 relative">
          {/* Circular Text Animation */}
          <div className="relative flex items-center justify-center">
            <CircularText
              text="ॐ HINDU ASSOCIATION OF IRELAND ॐ LIMERICK • AHANE • PALLASKENRY • MUNGRET ॐ"
              className="text-white/80"
            />
            {/* Central Logo */}
            <div className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-3">
              <div className="relative h-24 w-24">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-linear-to-br from-orange-400 via-amber-500 to-orange-600 animate-pulse-glow-saffron blur-sm scale-110" />
                {/* Gold border ring */}
                <div className="absolute inset-0 rounded-full bg-linear-to-br from-amber-300 via-orange-400 to-amber-600 p-[3px] shadow-2xl shadow-orange-500/60 glow-saffron-intense">
                  <div className="h-full w-full rounded-full overflow-hidden bg-white">
                    <img
                      src="/HAI%20(Green)%20%20Hindu%20Association%20Ireland%20logo-01.jpg"
                      alt="Hindu Association of Ireland"
                      className="h-full w-full object-contain rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-8 items-center pt-10">
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            {/* Primary CTA — Donate */}
            <button
              onClick={onDonateClick}
              className="group relative px-8 py-4 bg-linear-to-r from-orange-600 via-amber-500 to-orange-600 text-white rounded-full font-bold text-base shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110 hover-glow-saffron overflow-hidden"
            >
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
              <span className="relative flex items-center gap-2">
                <Heart weight="fill" />
                Support Our Cultural Center
              </span>
            </button>
            {/* Secondary CTA — Discover (outline/ghost on dark) */}
            <button
              onClick={() => navigate('/about')}
              className="group relative px-8 py-4 bg-white/10 backdrop-blur-lg text-white rounded-full font-bold text-base shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border-2 border-white/50 hover:border-white hover:bg-white/20 overflow-hidden"
            >
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
              <span className="relative flex items-center gap-2">
                Discover Our Story
              </span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
            >
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
              <span className="relative flex items-center gap-2">
                <HandsPraying size={20} weight="duotone" />
                Our Services
              </span>
            </button>
            <button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
            >
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
              <span className="relative flex items-center gap-2">
                <CalendarBlank size={20} weight="duotone" />
                Upcoming Events
              </span>
            </button>
          </div>
        </div>
      </HeroCarousel>

      {/* ──────────────── SERVICES + UPCOMING EVENTS ──────────────── */}
      <section
        id="services-section"
        className="relative py-16 md:py-20 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, oklch(0.97 0.012 85) 0%, oklch(0.95 0.02 75) 50%, oklch(0.96 0.018 80) 100%)' }}
        aria-labelledby="services-events-heading"
      >
        {/* Decorative background elements */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-orange-300/50 to-transparent" />
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-orange-200/25 blur-[80px]" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-amber-200/25 blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-orange-100/30 blur-[60px]" />
        </div>

        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative">
          {/* Section header */}
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold uppercase tracking-[0.18em] mb-5">
              <Sparkle size={14} weight="fill" />
              Worship · Celebrate · Belong
            </div>
            <h2 id="services-events-heading" className="text-4xl md:text-5xl font-bold text-orange-900 mb-4 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Services &amp; Upcoming Events
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Spiritual offerings and community gatherings — discover what's happening this season.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* ── SERVICES COLUMN ── */}
            <div className="flex flex-col gap-4">
              {/* Column heading */}
              <div className="flex items-center gap-3 pb-2 border-b border-orange-200/60">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-orange-600 to-amber-500 text-white shadow shadow-orange-500/30 shrink-0">
                  <HandsPraying size={20} weight="duotone" />
                </div>
                <h3 className="text-xl font-bold text-orange-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Our Services
                </h3>
              </div>

              {/* Three equal service cards — driven by admin/services */}
              {services.length === 0
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-4 bg-white rounded-2xl border border-orange-100 p-5 animate-pulse">
                      <div className="h-11 w-11 rounded-xl bg-orange-100 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-orange-100 rounded w-3/4" />
                        <div className="h-3 bg-orange-50 rounded w-full" />
                        <div className="h-3 bg-orange-50 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                : services.map((service) => {
                    const Icon = serviceIcon(service.category, service.title)
                    return (
                      <article
                        key={service.id}
                        onClick={() => navigate(`/services/${service.slug}`)}
                        className="group relative flex gap-4 bg-white rounded-2xl border border-orange-100 p-5 shadow-sm hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden"
                      >
                        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-br from-orange-50/0 to-amber-50/0 group-hover:from-orange-50/60 group-hover:to-amber-50/40 transition-all duration-500 rounded-2xl" />
                        <div className="relative shrink-0 flex items-start pt-0.5">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-400/30 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-400">
                            <Icon size={22} weight="duotone" />
                          </div>
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <h4 className="text-base font-bold text-orange-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                            {service.title}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                            {service.excerpt}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 group-hover:gap-2 transition-all duration-200">
                            Learn more
                            <ArrowRight size={11} weight="bold" />
                          </span>
                        </div>
                      </article>
                    )
                  })
              }

              <Button
                onClick={() => navigate('/services')}
                className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron font-semibold h-11 rounded-xl mt-1"
              >
                Explore All Services
                <ArrowRight className="ml-2" size={15} weight="bold" />
              </Button>
            </div>

            {/* ── EVENTS COLUMN ── */}
            <div className="flex flex-col gap-4">
              {/* Column heading */}
              <div className="flex items-center gap-3 pb-2 border-b border-orange-200/60">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-orange-600 to-amber-500 text-white shadow shadow-orange-500/30 shrink-0">
                  <CalendarBlank size={20} weight="duotone" />
                </div>
                <h3 className="text-xl font-bold text-orange-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Upcoming Events
                </h3>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="flex-1 flex flex-col gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-4 bg-white rounded-2xl border border-orange-100 p-5 animate-pulse">
                      <div className="h-11 w-14 rounded-xl bg-orange-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-orange-100 rounded w-3/4" />
                        <div className="h-3 bg-orange-50 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const d = new Date(event.date + 'T00:00:00')
                  const month = d.toLocaleString('en-IE', { month: 'short' }).toUpperCase()
                  const day = String(d.getDate()).padStart(2, '0')
                  return (
                    <article
                      key={event.id}
                      onClick={() => navigate(`/events/${event.slug}`)}
                      className="group relative flex gap-4 bg-white rounded-2xl border border-orange-100 p-5 shadow-sm hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden"
                    >
                      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-br from-orange-50/0 to-amber-50/0 group-hover:from-orange-50/60 group-hover:to-amber-50/40 transition-all duration-500 rounded-2xl" />
                      {/* Date badge */}
                      <div className="relative shrink-0 flex flex-col items-center justify-center bg-linear-to-br from-orange-100 to-amber-100 rounded-xl w-14 min-h-[52px] border border-orange-200/60">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-orange-600 leading-none">{month}</span>
                        <span className="text-2xl font-bold text-orange-800 leading-tight">{day}</span>
                      </div>
                      {/* Info */}
                      <div className="relative flex-1 min-w-0">
                        <h4 className="text-base font-bold text-orange-900 mb-1 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                          {event.title}
                        </h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {event.time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} weight="duotone" className="text-orange-500" />
                              {event.time}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={11} weight="duotone" className="text-orange-500" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                      <ArrowRight
                        size={16}
                        weight="bold"
                        className="relative self-center shrink-0 text-orange-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all duration-200"
                      />
                    </article>
                  )
                })
              )}

              {/* Pad with empty placeholders if fewer than 3 events so CTA stays aligned */}
              {upcomingEvents.length > 0 && upcomingEvents.length < 3 && Array.from({ length: 3 - upcomingEvents.length }).map((_, i) => (
                <div key={`pad-${i}`} className="rounded-2xl border border-dashed border-orange-200/60 bg-orange-50/30 p-5 flex items-center justify-center text-xs text-orange-400/60 italic">
                  More events coming soon
                </div>
              ))}

              <Button
                onClick={() => navigate('/events')}
                className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron font-semibold h-11 rounded-xl mt-1"
              >
                View Full Calendar
                <ArrowRight className="ml-2" size={15} weight="bold" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── PHOTO GALLERY ───────────────────────── */}
      <PhotoGallery preview={9} />

      {/* Donation CTA — deep temple-maroon (secondary) base with a soft
          turmeric inner glow. Primary saffron is kept on the small button
          only, which keeps the section devotional without shouting. */}
      <section className="py-8 md:py-12 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,196,140,0.18),transparent_70%)]" />
        <div className="container mx-auto px-6 md:px-12 lg:px-24 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Support Our Sacred Mission
            </h2>
            <p className="text-lg text-secondary-foreground/90 leading-relaxed">
              Your donations help us maintain the temple, conduct daily worship, organize festivals, and serve our community. Every contribution, big or small, makes a difference.
            </p>
            <Button
              onClick={onDonateClick}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all text-base h-12 px-8 hover-glow-saffron font-semibold"
            >
              <Heart className="mr-2" weight="fill" />
              Make a Donation
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}