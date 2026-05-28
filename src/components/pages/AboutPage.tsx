import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Heart, Users, BookOpen, Lightbulb, HandsPraying, MapPin, StarIcon, CompassIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { cn } from '@/lib/utils'
import { useTeam } from '@/hooks/useTeam'

type AboutTarget = 'story' | 'values' | 'team' | 'vision'

export function AboutPage() {
  const [highlightedId, setHighlightedId] = useState<AboutTarget | null>(null)
  const { teamMembers, loading: teamLoading } = useTeam()

  const scrollToSection = (target: AboutTarget) => {
    const elId = target === 'story' ? 'story-section' : target === 'values' ? 'values-section' : target === 'vision' ? 'vision-section' : 'team-section'
    const el = document.getElementById(elId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setHighlightedId(target)
    window.setTimeout(
      () => setHighlightedId((cur) => (cur === target ? null : cur)),
      1800,
    )
  }

  const values = [
    {
      icon: Heart,
      title: 'Devotion',
      description: 'Fostering deep spiritual connection through authentic worship and practice'
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Building bonds of friendship and support among all who seek the divine'
    },
    {
      icon: BookOpen,
      title: 'Knowledge',
      description: 'Preserving and sharing ancient wisdom for modern spiritual seekers'
    },
    {
      icon: Lightbulb,
      title: 'Enlightenment',
      description: 'Guiding individuals on their path to self-realization and inner peace'
    }
  ]

  return (
    <div className="flex flex-col">
      <HeroCarousel
        title="About the Hindu Association of Ireland"
        subtitle="A decade of cultural, religious and community service across Limerick"
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <button
            onClick={() => scrollToSection('story')}
            className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span aria-hidden className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <BookOpen size={20} weight="duotone" />
              Our Story
            </span>
          </button>
          <button
            onClick={() => scrollToSection('values')}
            className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span aria-hidden className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <Heart size={20} weight="duotone" />
              Core Values
            </span>
          </button>
          <button
            onClick={() => scrollToSection('vision')}
            className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span aria-hidden className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <StarIcon size={20} weight="duotone" />
              Our Vision
            </span>
          </button>
          <button
            onClick={() => scrollToSection('team')}
            className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span aria-hidden className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <Users size={20} weight="duotone" />
              Our Team
            </span>
          </button>
        </div>
      </HeroCarousel>

      <section id="story-section" className={cn('scroll-mt-32 py-16 md:py-24 bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-50 transition-shadow', highlightedId === 'story' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">

            {/* Left: Our Story */}
            <div className="lg:col-span-2 space-y-8">
              <Card id="story-card" className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
                      <BookOpen className="text-orange-600" size={32} weight="duotone" />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                        Our Story
                      </h2>
                      <p className="text-orange-600 text-sm mt-1">A decade of service in Limerick</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-base text-foreground/90 leading-relaxed">
                    <p>
                      The Hindu Association of Ireland (HAI) is a united platform
                      representing members from all Hindu communities across India, bound
                      by a common vision: to establish a permanent Hindu Temple in
                      Limerick that will serve as a spiritual, cultural and community
                      hub for future generations.
                    </p>
                    <p>
                      Over the past 10 years, HAI members have consistently organised
                      and supported diverse cultural, religious and community service
                      events throughout Limerick — from Sri Rama Navami and Diwali to
                      Onam, Ganesh Chaturthi and monthly community prayers.
                    </p>
                    <p>
                      This decade of sustained presence and engagement is a testament to
                      our commitment, and our greatest strength. Today HAI welcomes
                      devotees and friends to gatherings at Ahane Hall, Pallaskenry
                      Community Centre and Mungret.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="rounded-xl bg-linear-to-br from-amber-100 to-orange-100 p-3 glow-saffron">
                      <Lightbulb className="text-orange-600" size={32} weight="duotone" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                      Our Mission
                    </h2>
                  </div>
                  <p className="text-base text-foreground/90 leading-relaxed">
                    To preserve and propagate the timeless teachings of Sanatana Dharma
                    while building a permanent Hindu Temple in Limerick — a welcoming
                    space where individuals of all ages can explore their spiritual
                    potential, connect with the divine and contribute to a more
                    harmonious community.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
                      <HandsPraying className="text-orange-600" size={32} weight="duotone" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                      Deities We Celebrate
                    </h2>
                  </div>
                  <div className="space-y-4 text-base text-foreground/90 leading-relaxed">
                    <p>
                      HAI events honour all major Hindu deities across the calendar
                      year — Sri Rama on Rama Navami, Lord Krishna on Janmashtami,
                      Goddess Lakshmi on Varalakshmi Vratam, Lord Ganesha on Ganesh
                      Chaturthi and Goddess Durga on Dussehra.
                    </p>
                    <p>
                      Each celebration is conducted according to traditional Vedic
                      rites with bhajans, abhishekam and community prasad shared by
                      every attendee.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Core Values */}
            <div id="values-section" className={cn('lg:col-span-1 scroll-mt-32 rounded-2xl transition-shadow', highlightedId === 'values' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
              <div className="sticky top-32">
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                    Core Values
                  </h2>
                  <p className="text-muted-foreground">
                    Principles that guide us
                  </p>
                </div>
                <div className="space-y-4">
                  {values.map((value) => (
                    <Card key={value.title} className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all hover:scale-[1.02] duration-300 hover-glow-saffron bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-linear-to-br from-orange-100 to-amber-100 p-2 glow-saffron shrink-0">
                            <value.icon className="text-orange-600" size={24} weight="duotone" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-orange-800 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                              {value.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed text-sm">
                              {value.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-card">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
              Community & Outreach
            </h2>
            <div className="space-y-6 text-lg text-foreground/90 leading-relaxed">
              <p>
                The Hindu Association of Ireland is deeply committed to serving the
                broader Limerick community through outreach programmes — community
                prayers, cultural festivals, yoga days and interfaith dialogue. Many
                of our events are held at venues including Ahane Hall, Pallaskenry
                Community Centre and Mungret.
              </p>
              <p>
                Our gatherings are open to all, regardless of background or belief.
                We welcome spiritual seekers, curious visitors and anyone looking
                for a moment of peace and reflection on their journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Vision */}
      <section
        id="vision-section"
        className={cn(
          'scroll-mt-32 py-16 md:py-24 bg-linear-to-br from-orange-50 via-amber-50/40 to-slate-50 transition-shadow',
          highlightedId === 'vision' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron',
        )}
      >
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">

            {/* Left: Vision + Design Inspiration */}
            <div className="lg:col-span-2 space-y-8">
              {/* Section header */}
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 glow-saffron shrink-0">
                  <StarIcon className="text-orange-600" size={32} weight="duotone" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                    A Vision Rooted in Devotion
                  </h2>
                  <p className="text-orange-600 text-sm mt-1">The future we are building together</p>
                </div>
              </div>

              {/* Intro card */}
              <Card className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-8 md:p-10">
                  <p className="text-base md:text-lg text-foreground/90 leading-relaxed">
                    Our dream is to build a sacred space that will serve as a center for worship,
                    learning, and community. The future temple will be a place where people of all
                    ages can come together to connect with their faith, celebrate traditions, and
                    grow spiritually.
                  </p>
                </CardContent>
              </Card>

              {/* Design Inspiration card */}
              <Card className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="rounded-xl bg-linear-to-br from-amber-100 to-orange-100 p-3 glow-saffron shrink-0">
                      <CompassIcon className="text-orange-600" size={28} weight="duotone" />
                    </div>
                    <h3 className="text-2xl font-bold text-orange-800 mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
                      Design Inspiration
                    </h3>
                  </div>
                  <p className="text-base text-foreground/90 leading-relaxed">
                    Our temple design will combine traditional architecture with modern
                    functionality, ensuring it is both beautiful and welcoming.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Timeline */}
            <div className="lg:col-span-1">
                <Card className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 glow-saffron shrink-0">
                        <CalendarBlankIcon className="text-orange-600" size={26} weight="duotone" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                          Our Timeline
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          Steady steps toward the vision
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-8">
                      {/* Vertical connector line */}
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-linear-to-b from-orange-400 via-amber-400 to-orange-200 rounded-full" />

                      <div className="space-y-8">
                        {/* Phase 1 */}
                        <div className="relative flex gap-5 pl-14">
                          <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-linear-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg ring-4 ring-orange-100 shrink-0 text-xs font-bold">
                            1
                          </div>
                          <div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold mb-2">
                              Now – July 2026
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              Fundraising, community planning, and design finalization.
                            </p>
                          </div>
                        </div>

                        {/* Phase 2 */}
                        <div className="relative flex gap-5 pl-14">
                          <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-linear-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg ring-4 ring-amber-100 shrink-0 text-xs font-bold">
                            2
                          </div>
                          <div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-2">
                              July 2026 – July 2027
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              Goal to purchase land for the temple.
                            </p>
                          </div>
                        </div>

                        {/* Phase 3 */}
                        <div className="relative flex gap-5 pl-14">
                          <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-amber-400 text-white flex items-center justify-center shadow-lg ring-4 ring-orange-50 shrink-0 text-xs font-bold">
                            3
                          </div>
                          <div>
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold mb-2">
                              Beyond 2027
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              Begin construction and bring the temple to life.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            </div>

          </div>
        </div>
      </section>

      {/* Our Team */}
      <section id="team-section" className={cn('relative scroll-mt-32 py-10 md:py-14 bg-linear-to-b from-white via-orange-50/30 to-white overflow-hidden transition-shadow', highlightedId === 'team' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
        {/* subtle background pattern */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(194 65 12) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-14 md:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold uppercase tracking-wider mb-5">
                <Users size={14} weight="fill" />
                Leadership & Community
              </div>
              <h2
                className="text-4xl md:text-5xl font-bold mb-4 text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Meet the people behind HAI
              </h2>
              <div className="mx-auto w-16 h-1 rounded-full bg-linear-to-r from-orange-500 to-amber-500 mb-5" />
              <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                A volunteer-led team of professionals and community organisers from
                across India and Sri Lanka, bringing the Hindu Association of Ireland
                to life in Limerick.
              </p>
            </div>

            {/* Team marquee */}
            <div className="relative overflow-hidden">
              {/* Fade edges */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-white to-transparent" />

              <div className="team-marquee-track gap-6 py-4">
                {teamLoading ? (
                  <p className="text-slate-500 px-8 py-8">Loading team…</p>
                ) : (
                  [...teamMembers, ...teamMembers].map((member, idx) => {
                    const initials = member.name
                      .split(' ')
                      .filter((p) => !p.endsWith('.'))
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                    return (
                      <article
                        key={`${member.id}-${idx}`}
                        className="group relative flex-shrink-0 w-60 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_24px_48px_-12px_rgba(194,65,12,0.18)] hover:border-orange-300 transition-all duration-300 overflow-hidden"
                      >
                        {/* Accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-orange-500 via-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Photo / avatar */}
                        <div className="relative h-44 bg-linear-to-br from-orange-50 via-amber-50 to-orange-100/60 overflow-hidden">
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt={member.name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <>
                              <div
                                aria-hidden
                                className="absolute inset-0 opacity-40"
                                style={{
                                  backgroundImage:
                                    'radial-gradient(circle at 20% 30%, rgba(251,146,60,0.25), transparent 50%), radial-gradient(circle at 80% 60%, rgba(245,158,11,0.18), transparent 55%)',
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                  <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
                                  <div className="relative w-20 h-20 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-white">
                                    {initials}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Body */}
                        <div className="px-5 py-4">
                          <h3
                            className="font-bold text-base text-slate-900 leading-tight tracking-tight"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {member.name}
                          </h3>
                          <p className="text-[13px] font-semibold text-orange-700 mt-0.5 leading-snug">
                            {member.role}
                          </p>

                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
                            <MapPin size={11} weight="fill" className="text-orange-600" />
                            {member.origin}
                          </div>

                          <Separator className="my-3 bg-slate-100" />

                          <p className="text-[12.5px] text-slate-600 leading-relaxed line-clamp-4">
                            {member.bio}
                          </p>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/60">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            HAI Volunteer
                          </span>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </div>

            {/* Footnote */}
            <div className="mt-14 text-center">
              <p className="text-sm text-slate-500 max-w-xl mx-auto">
                Interested in joining the team or volunteering for an event?{' '}
                <a
                  href="/contact"
                  className="text-orange-700 font-semibold hover:text-orange-800 underline underline-offset-4 decoration-orange-300 hover:decoration-orange-600 transition-colors"
                >
                  Get in touch
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}