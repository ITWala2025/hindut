import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Phone, Envelope } from '@phosphor-icons/react'
import { useServices } from '@/hooks/useServices'
import { SeoMeta } from '@/lib/seo'

export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { services, loading } = useServices()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const service = useMemo(
    () => services.find((s) => s.slug === slug && s.published),
    [services, slug],
  )

  if (loading) return <ServiceDetailSkeleton />

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-3xl">
          🙏
        </div>
        <h1 className="text-2xl font-bold text-orange-900" style={{ fontFamily: 'var(--font-heading)' }}>
          Service not found
        </h1>
        <p className="text-slate-500 max-w-sm">
          This service may have been removed or the link may be incorrect.
        </p>
        <Button
          onClick={() => navigate('/services')}
          className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-6"
        >
          Browse all services
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FDFAF5' }}>
      <SeoMeta
        title={`${service.title} — Hindu Temple Limerick`}
        description={service.excerpt.slice(0, 160)}
        canonical={`/services/${service.slug}`}
      />

      {/* Floating back button — appears after scroll */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out ${
          scrolled
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        style={{ top: '76px', left: '16px' }}
      >
        <Link
          to="/services"
          className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm shadow-lg border border-orange-100 rounded-full pl-3 pr-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 hover:text-orange-900 transition-colors"
        >
          <ArrowLeft size={14} weight="bold" />
          All services
        </Link>
      </div>

      {/* Hero */}
      <section className="relative w-full overflow-hidden" style={{ height: 'clamp(380px, 60vh, 600px)' }}>
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <NoImageHero />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Back button inside hero */}
        <div
          className={`absolute top-6 left-6 z-10 transition-opacity duration-300 ${
            scrolled ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Link
            to="/services"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 rounded-full pl-3 pr-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            All services
          </Link>
        </div>

        {/* Title + category badge */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 lg:px-16 pb-10">
          {service.category && (
            <span className="inline-block mb-3 text-xs font-bold uppercase tracking-widest text-amber-300 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5">
              {service.category}
            </span>
          )}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl"
            style={{ fontFamily: 'var(--font-heading)', textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}
          >
            {service.title}
          </h1>
        </div>
      </section>

      {/* Content — overlaps hero bottom */}
      <div className="relative -mt-6 z-10">
        <div className="rounded-t-3xl pt-10 pb-20" style={{ background: '#FDFAF5' }}>
          <div className="container mx-auto max-w-5xl px-6 md:px-10 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

              {/* Left: full content */}
              <div className="lg:col-span-2 space-y-8">
                {service.excerpt && (
                  <p className="text-lg text-slate-600 leading-relaxed border-l-4 border-orange-300 pl-5 italic">
                    {service.excerpt}
                  </p>
                )}

                {service.content && (
                  <div>
                    <h2
                      className="text-lg font-bold text-orange-800/60 uppercase tracking-widest mb-4"
                      style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.15em' }}
                    >
                      About this service
                    </h2>
                    <div
                      className="rich-content text-slate-700 leading-relaxed"
                      style={{ fontSize: '1.0625rem' }}
                      dangerouslySetInnerHTML={{ __html: service.content }}
                    />
                  </div>
                )}

                {/* Mobile contact CTA */}
                <div className="lg:hidden">
                  <ContactCard />
                </div>
              </div>

              {/* Right: sticky contact card */}
              <div className="hidden lg:block">
                <div className="sticky top-24">
                  <ContactCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactCard() {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400" />
      <div className="p-6 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-1">Book this service</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Contact us to arrange this service or get more information about our programs.
          </p>
        </div>

        <div className="border-t border-orange-50" />

        <div className="space-y-3">
          <a
            href="tel:+353874953334"
            className="flex items-center gap-3 w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-sm shadow-orange-200"
          >
            <Phone size={16} weight="fill" />
            Call (087) 495 3334
          </a>
          <a
            href="mailto:hinduassociationireland@gmail.com"
            className="flex items-center gap-3 w-full border-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-semibold px-5 py-3 rounded-xl transition-all"
          >
            <Envelope size={16} weight="duotone" />
            Send Email
          </a>
        </div>

        <p className="text-center text-xs text-slate-400">We respond within 24 hours</p>
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
      {[340, 240, 160, 90].map((size, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8"
          style={{ width: size, height: size, opacity: 0.18 - i * 0.03 }}
        />
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-amber-400/20 blur-xl" />
    </div>
  )
}

function ServiceDetailSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#FDFAF5' }}>
      <Skeleton className="w-full rounded-none" style={{ height: 'clamp(380px, 60vh, 600px)' }} />
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
