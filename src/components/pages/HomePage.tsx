import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, CalendarBlank, Users, HandsPraying, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { CircularText } from '@/components/CircularText'

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
      description: 'Experience divine blessings through our traditional daily worship ceremonies'
    },
    {
      icon: CalendarBlank,
      title: 'Festival Celebrations',
      description: 'Join us in celebrating major Hindu festivals with grandeur and devotion'
    },
    {
      icon: Users,
      title: 'Community Programs',
      description: 'Educational classes, cultural events, and spiritual discourses for all ages'
    }
  ]

  const upcomingEvents = [
    {
      date: 'Mar 21',
      title: 'Sri Rama Navami',
      time: 'Ahane Hall • 10:00 AM',
    },
    {
      date: 'Apr 25',
      title: 'Hindu New Year',
      time: 'Ahane Hall • 11:00 AM',
    },
    {
      date: 'May 09',
      title: 'Akshaya Tritiya',
      time: 'Ahane Hall • 10:30 AM',
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

      {/* Combined Services and Events Section — calm muted backdrop so the
          saffron primary is reserved for small accents (icons, buttons). */}
      <section id="services-section" className="py-16 md:py-24 bg-gradient-to-b from-background via-muted/40 to-background">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 lg:items-stretch">

            {/* Our Services */}
            <div className="flex flex-col">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Our Services
                </h2>
                <p className="text-muted-foreground text-lg">
                  Spiritual services and programs to enrich your journey
                </p>
              </div>
              <div className="flex flex-col flex-1 gap-4">
                {services.map((service) => (
                  <Card key={service.title} className="flex-1 flex flex-col border-l-4 border-l-orange-500 hover:shadow-xl transition-all hover:scale-[1.02] duration-300 hover-glow-saffron bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6 flex flex-1 items-center">
                      <div className="flex gap-4 items-start">
                        <div className="rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 p-3 glow-saffron flex-shrink-0">
                          <service.icon className="text-orange-600" size={32} weight="duotone" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-orange-800 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                            {service.title}
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="pt-4 mt-auto">
                  <Button
                    onClick={() => navigate('/services')}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron font-semibold h-12"
                  >
                    View All Services
                  </Button>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="flex flex-col">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Upcoming Events
                </h2>
                <p className="text-muted-foreground text-lg">
                  Join us in celebrating sacred traditions
                </p>
              </div>
              <div className="flex flex-col flex-1 gap-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.title} className="flex-1 flex flex-col border-l-4 border-l-orange-500 hover:shadow-xl transition-all hover:scale-[1.02] duration-300 hover-glow-saffron bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6 flex flex-1 items-center">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4 min-w-[80px] glow-saffron">
                          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">{event.date.split(' ')[0]}</span>
                          <span className="text-3xl font-bold text-orange-700">{event.date.split(' ')[1]}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                            {event.title}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <CalendarBlank className="text-orange-600" size={16} weight="duotone" />
                            {event.time}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="pt-4 mt-auto">
                  <Button
                    onClick={() => navigate('/events')}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron font-semibold h-12"
                  >
                    View All Events
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Donation CTA — deep temple-maroon (secondary) base with a soft
          turmeric inner glow. Primary saffron is kept on the small button
          only, which keeps the section devotional without shouting. */}
      <section className="py-16 md:py-24 bg-secondary relative overflow-hidden">
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