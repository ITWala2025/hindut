import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Heart, Users, BookOpen, Lightbulb, HandsPraying, MapPin } from '@phosphor-icons/react'
import { HeroCarousel } from '@/components/HeroCarousel'
import { cn } from '@/lib/utils'
import { TEAM_MEMBERS } from '@/data/team'

type AboutTarget = 'story' | 'values' | 'team'

export function AboutPage() {
  const [highlightedId, setHighlightedId] = useState<AboutTarget | null>(null)

  const scrollToSection = (target: AboutTarget) => {
    const elId = target === 'story' ? 'story-section' : target === 'values' ? 'values-section' : 'team-section'
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
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <BookOpen size={20} weight="duotone" />
              Our Story
            </span>
          </button>
          <button
            onClick={() => scrollToSection('values')}
            className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <Heart size={20} weight="duotone" />
              Core Values
            </span>
          </button>
          <button
            onClick={() => scrollToSection('team')}
            className="group relative px-6 py-3 bg-white/10 backdrop-blur-md text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-white/30 transition-all duration-300 hover:scale-105 border border-white/30 hover:bg-white/20 overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
            <span className="relative flex items-center gap-2">
              <Users size={20} weight="duotone" />
              Our Team
            </span>
          </button>
        </div>
      </HeroCarousel>

      <section id="story-section" className={cn('scroll-mt-32 py-16 md:py-24 bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 transition-shadow', highlightedId === 'story' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">

            {/* Left: Our Story */}
            <div className="lg:col-span-2 space-y-8">
              <Card id="story-card" className="border-orange-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
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
                    <div className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-3 glow-saffron">
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
                    <div className="rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
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
                          <div className="rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 p-2 glow-saffron flex-shrink-0">
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

      <section className="py-16 md:py-24 bg-card">
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

      {/* Our Team */}
      <section id="team-section" className={cn('relative scroll-mt-32 py-20 md:py-28 bg-gradient-to-b from-white via-orange-50/30 to-white overflow-hidden transition-shadow', highlightedId === 'team' && 'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron')}>
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
              <div className="mx-auto w-16 h-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 mb-5" />
              <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                A volunteer-led team of professionals and community organisers from
                across India and Sri Lanka, bringing the Hindu Association of Ireland
                to life in Limerick.
              </p>
            </div>

            {/* Team grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {TEAM_MEMBERS.map((member) => {
                const initials = member.name
                  .split(' ')
                  .filter((p) => !p.endsWith('.'))
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
                return (
                  <article
                    key={member.id}
                    className="group relative rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_24px_48px_-12px_rgba(194,65,12,0.18)] hover:border-orange-300 transition-all duration-300 overflow-hidden"
                  >
                    {/* Accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Avatar header — subtle saffron wash */}
                    <div className="relative h-28 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 border-b border-slate-100">
                      <div
                        aria-hidden
                        className="absolute inset-0 opacity-40"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 20% 30%, rgba(251,146,60,0.25), transparent 50%), radial-gradient(circle at 80% 60%, rgba(245,158,11,0.18), transparent 55%)',
                        }}
                      />
                      <div className="absolute -bottom-9 left-6">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
                          <div className="relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-xl flex items-center justify-center shadow-lg ring-4 ring-white">
                            {initials}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="pt-12 px-6 pb-6">
                      <h3
                        className="font-bold text-lg text-slate-900 leading-tight tracking-tight"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {member.name}
                      </h3>
                      <p className="text-[13px] font-semibold text-orange-700 mt-1 leading-snug">
                        {member.role}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
                        <MapPin size={12} weight="fill" className="text-orange-600" />
                        {member.origin}
                      </div>

                      <Separator className="my-4 bg-slate-100" />

                      <p className="text-[13.5px] text-slate-600 leading-relaxed line-clamp-5">
                        {member.bio}
                      </p>
                    </div>

                    {/* Footer chip */}
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        HAI Volunteer
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        #{member.id.slice(0, 8)}
                      </span>
                    </div>
                  </article>
                )
              })}
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