import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, CalendarBlank, Users, HandsPraying, SpeakerHigh, SpeakerSlash, ArrowRight, MapPin, Clock, Sparkle } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { CircularText } from '@/components/CircularText'
import { PhotoGallery } from '@/components/PhotoGallery'

interface HomePageProps {
  onDonateClick: () => void
}

export function HomePage({ onDonateClick }: HomePageProps) {
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

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
  const services = [
    {
      icon: HandsPraying,
      title: 'Daily Pujas',
      description: 'Experience divine blessings through our traditional daily worship ceremonies — morning aarti, abhishekam and sandhya prayers.',
      featured: true,
      cta: 'Service Times',
    },
    {
      icon: CalendarBlank,
      title: 'Festival Celebrations',
      description: 'Diwali, Navratri, Holi, Janmashtami and more — celebrated with grandeur, devotion and the whole community together.',
      cta: 'View Calendar',
    },
    {
      icon: Users,
      title: 'Community Programs',
      description: 'Sanskrit & Bhajan classes, yoga, cultural workshops and spiritual discourses — programs for every age group.',
      cta: 'Join a Program',
    },
  ]

  const upcomingEvents = [
    {
      date: 'Mar 21',
      title: 'Sri Rama Navami',
      time: '10:00 AM',
      location: 'Ahane Hall',
      featured: true,
    },
    {
      date: 'Apr 25',
      title: 'Hindu New Year',
      time: '11:00 AM',
      location: 'Ahane Hall',
    },
    {
      date: 'May 09',
      title: 'Akshaya Tritiya',
      time: '10:30 AM',
      location: 'Ahane Hall',
    },
  ]

  return (
    <div className="flex flex-col relative">
      {/* Background Music - Krishna Bhajan */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        src="/krishna-bhajan.m4a"
        onError={(e) => console.error('Audio loading error:', e)}
        onLoadedData={() => console.log('Audio loaded successfully')}
      />

      {/* Audio Control Button */}
      <button
        onClick={toggleAudio}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110 glow-saffron flex items-center justify-center"
        aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
        title={isPlaying ? 'Pause background music' : 'Play background music'}
      >
        {isPlaying ? (
          <SpeakerHigh size={24} weight="fill" />
        ) : (
          <SpeakerSlash size={24} weight="fill" />
        )}
      </button>

      <HeroCarousel
        title="Welcome to the Hindu Association of Ireland"
        subtitle="A united platform working to establish a permanent Hindu Temple in Limerick — join us in prayer, celebration and community."
        enableRevealAnimation={true}
      >
        <div className="inline-block mb-8 relative">
          {/* Circular Text Animation */}
          <div className="relative flex items-center justify-center">
            <CircularText
              text="ॐ HINDU ASSOCIATION OF IRELAND ॐ LIMERICK • AHANE • PALLASKENRY • MUNGRET ॐ"
              className="text-white/80"
            />
            {/* Central OM Symbol */}
            <div className="absolute flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg glow-saffron-intense animate-pulse-glow-saffron z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-3">
              <span className="text-5xl font-bold text-white">ॐ</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-8 items-center pt-4">
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <button
              onClick={() => navigate('/about')}
              className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 text-white rounded-full font-bold text-base shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110 hover-glow-saffron overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
              <span className="relative flex items-center gap-2">
                Discover Our Story
              </span>
            </button>
            <button
              onClick={onDonateClick}
              className="group relative px-8 py-4 bg-white/90 backdrop-blur-lg text-orange-700 rounded-full font-bold text-base shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-110 border-2 border-white/50 hover:border-white overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
              <span className="relative flex items-center gap-2">
                <Heart weight="fill" />
                Support Our Temple
              </span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
              <span className="relative flex items-center gap-2">
                <HandsPraying size={20} weight="duotone" />
                Our Services
              </span>
            </button>
            <button
              onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
              <span className="relative flex items-center gap-2">
                <CalendarBlank size={20} weight="duotone" />
                Upcoming Events
              </span>
            </button>
          </div>
        </div>
      </HeroCarousel>

      {/* ──────────────── SERVICES + UPCOMING EVENTS (Side-by-Side) ────────────────
          Two stunning, mirrored columns on desktop. On mobile they stack
          gracefully. Each column has a featured hero card on top and
          compact list items beneath, with its own CTA.
      */}
      <section
        id="services-section"
        className="relative py-10 md:py-14 bg-gradient-to-b from-background via-orange-50/40 to-amber-50/30 overflow-hidden"
        aria-labelledby="services-events-heading"
      >
        <div aria-hidden="true" className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-orange-700 text-xs font-semibold uppercase tracking-[0.15em] mb-4 shadow-sm">
              <Sparkle size={16} weight="fill" />
              Worship · Celebrate · Belong
            </div>
            <h2 id="services-events-heading" className="text-3xl md:text-5xl font-bold text-orange-800 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Services &amp; Upcoming Events
            </h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Spiritual offerings and gatherings that bring our community together — discover what's happening this season.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">

            {/* ────── OUR SERVICES COLUMN ────── */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30">
                  <HandsPraying size={22} weight="duotone" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Our Services
                </h3>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                {services.map((service, idx) => {
                  const Icon = service.icon
                  if (idx === 0) {
                    return (
                      <article
                        key={service.title}
                        className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-700 via-orange-600 to-amber-600 text-white p-7 md:p-8 shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 transition-all duration-500 min-h-[260px] flex"
                      >
                        <div aria-hidden="true" className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                        <div aria-hidden="true" className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
                        <div className="relative flex-1 flex flex-col">
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-100 mb-3">Featured</span>
                          <div className="flex items-start gap-5 flex-1">
                            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                              <Icon size={30} weight="duotone" />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <h4 className="text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                                {service.title}
                              </h4>
                              <p className="text-white/90 leading-relaxed text-sm mb-4 flex-1">
                                {service.description}
                              </p>
                              <button
                                onClick={() => navigate('/services')}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 py-2 rounded-full ring-1 ring-white/20 transition-all hover:gap-3 self-start"
                              >
                                {service.cta}
                                <ArrowRight size={12} weight="bold" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  }
                  return (
                    <article
                      key={service.title}
                      className="group relative rounded-2xl bg-white border border-orange-100 p-5 md:p-6 shadow-sm hover:shadow-xl hover:shadow-orange-500/15 hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-500 overflow-hidden min-h-[120px] flex items-center cursor-pointer"
                      onClick={() => navigate('/services')}
                    >
                      <div aria-hidden="true" className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 opacity-50 group-hover:scale-150 transition-transform duration-700" />
                      <div className="relative flex items-start gap-4 w-full">
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 flex-shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                          <Icon size={22} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-orange-800 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                            {service.title}
                          </h4>
                          <p className="text-muted-foreground text-xs leading-relaxed mb-2">
                            {service.description}
                          </p>
                          <button
                            onClick={() => navigate('/services')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:gap-2 transition-all"
                          >
                            {service.cta}
                            <ArrowRight size={12} weight="bold" />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}

                <Button
                  onClick={() => navigate('/services')}
                  className="mt-auto bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron font-semibold h-12"
                >
                  Explore All Services
                  <ArrowRight className="ml-2" size={16} weight="bold" />
                </Button>
              </div>
            </div>

            {/* ────── UPCOMING EVENTS COLUMN ────── */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30">
                  <CalendarBlank size={22} weight="duotone" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Upcoming Events
                </h3>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                {upcomingEvents.map((event, idx) => {
                  const [month, day] = event.date.split(' ')
                  if (idx === 0) {
                    return (
                      <article
                        key={event.title}
                        className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-700 via-orange-600 to-amber-600 text-white p-7 md:p-8 shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 transition-all duration-500 min-h-[260px] flex"
                      >
                        <div aria-hidden="true" className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
                        <div className="relative flex-1 flex flex-col">
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-100 mb-3">Next Up</span>
                          <div className="flex items-start gap-5 flex-1">
                            <div className="flex flex-col items-center justify-center bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 min-w-[88px] ring-1 ring-white/20 flex-shrink-0">
                              <span className="text-xs font-semibold uppercase tracking-wide text-amber-100">{month}</span>
                              <span className="text-4xl font-bold leading-none mt-1">{day}</span>
                            </div>
                            <div className="flex-1 flex flex-col">
                              <h4 className="text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                                {event.title}
                              </h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/90 mb-4 flex-1">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock size={14} weight="duotone" />
                                  {event.time}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin size={14} weight="duotone" />
                                  {event.location}
                                </span>
                              </div>
                              <button
                                onClick={() => navigate('/events')}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 py-2 rounded-full ring-1 ring-white/20 transition-all hover:gap-3 self-start"
                              >
                                Event Details
                                <ArrowRight size={12} weight="bold" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  }
                  return (
                    <article
                      key={event.title}
                      className="group relative rounded-2xl bg-white p-5 md:p-6 shadow-sm hover:shadow-xl hover:shadow-orange-500/15 hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-500 border border-orange-100 cursor-pointer min-h-[120px] flex items-center"
                      onClick={() => navigate('/events')}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl px-4 py-2.5 min-w-[72px] flex-shrink-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">{month}</span>
                          <span className="text-2xl font-bold text-orange-700 leading-none mt-0.5">{day}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base text-orange-800 mb-1 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                            {event.title}
                          </h4>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} weight="duotone" className="text-orange-600" />
                              {event.time}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} weight="duotone" className="text-orange-600" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <ArrowRight
                          size={18}
                          weight="bold"
                          className="text-orange-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0"
                        />
                      </div>
                    </article>
                  )
                })}

                <Button
                  onClick={() => navigate('/events')}
                  className="mt-auto bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron font-semibold h-12"
                >
                  View Full Calendar
                  <ArrowRight className="ml-2" size={16} weight="bold" />
                </Button>
              </div>
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