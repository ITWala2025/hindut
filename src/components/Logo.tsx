interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  /** Show the registered charity/trust ID beneath the org name (header only). */
  trustId?: string | null
  className?: string
}

export function Logo({ size = 'md', showText = true, trustId, className = '' }: LogoProps) {
  const containerSize = {
    sm: 'h-9 w-9 md:h-10 md:w-10',
    md: 'h-11 w-11 md:h-14 md:w-14',
    lg: 'h-20 w-20 md:h-24 md:w-24',
  }

  const titleSize = {
    sm: 'text-sm',
    md: 'text-base md:text-lg',
    lg: 'text-xl md:text-2xl',
  }

  return (
    <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
      <div className={`relative ${containerSize[size]} shrink-0`}>
        {/* Outer glow ring — matches hero section */}
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-orange-400 via-amber-500 to-orange-600 animate-pulse-glow-saffron blur-sm scale-110" />
        {/* Gold border ring */}
        <div className="absolute inset-0 rounded-full bg-linear-to-br from-amber-300 via-orange-400 to-amber-600 p-[3px] shadow-2xl shadow-orange-500/60 glow-saffron-intense">
          <div className="h-full w-full rounded-full overflow-hidden bg-white">
            <img
              src="/HAI%20(Green)%20%20Hindu%20Association%20Ireland%20logo-01.jpg"
              alt="Hindu Association of Ireland"
              className="h-full w-full object-contain rounded-full"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <span
            className={`${titleSize[size]} font-semibold tracking-tight text-orange-800`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Hindu Association of Ireland
          </span>
          {trustId && (
            <span className="text-[10px] md:text-[11px] font-medium tracking-wide text-orange-600/80">
              Trust ID: {trustId}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
