import { ReactNode } from 'react'

interface HeroCarouselProps {
  title: string
  subtitle?: string
  children?: ReactNode
  enableRevealAnimation?: boolean
  /**
   * Optional list of background image URLs. Defaults to the temple images
   * present in /public/images. Drop additional files into that folder and
   * extend DEFAULT_IMAGES (or pass `images`) to get a true rolling
   * carousel — with a single image we automatically fall back to a slow
   * Ken Burns zoom so the hero never looks static or empty.
   */
  images?: string[]
}

// Background images served from Supabase Storage (public-gallery / branding/).
const DEFAULT_IMAGES = [
  'https://gsqfaguqsmnuoeuhpxro.supabase.co/storage/v1/object/public/public-gallery/branding/Hindu_T.png',
]

export function HeroCarousel({
  title,
  subtitle,
  children,
  enableRevealAnimation = false,
  images,
}: HeroCarouselProps) {
  const sourceImages = images && images.length > 0 ? images : DEFAULT_IMAGES
  const isSingleImage = sourceImages.length === 1

  // Duplicate the list so the translateX(-50%) loop is seamless.
  const slides = isSingleImage ? sourceImages : [...sourceImages, ...sourceImages]
  const trackWidthPct = slides.length * 100 // each slide fills 100vw
  const slideWidthPct = 100 / slides.length // % of the track

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Scrolling Background Images */}
      <div className={`absolute inset-0 ${enableRevealAnimation ? 'hero-reveal' : ''}`}>
        {isSingleImage ? (
          // Single image → Ken Burns slow zoom, no horizontal translate
          <div
            className="hero-kenburns"
            style={{ backgroundImage: `url(${slides[0]})` }}
          />
        ) : (
          <div
            className={`hero-carousel-track ${enableRevealAnimation ? 'with-reveal' : ''}`}
            style={{ width: `${trackWidthPct}%` }}
          >
            {slides.map((image, index) => (
              <div
                key={index}
                className="hero-carousel-slide"
                style={{
                  backgroundImage: `url(${image})`,
                  flex: `0 0 ${slideWidthPct}%`,
                }}
              />
            ))}
          </div>
        )}
        {/* Lighter overlay — keeps text readable while letting the temple
            imagery clearly show through. */}
        <div className="absolute inset-0 bg-linear-to-b from-black/35 via-black/20 to-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_65%,rgba(0,0,0,0.35),transparent_70%)]" />
      </div>

      {/* Content - with top padding to avoid header overlap */}
      <div className="container relative z-10 mx-auto px-6 md:px-12 lg:px-24 text-center pt-28 sm:pt-32 md:pt-40 pb-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-white text-glow-saffron drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  )
}

