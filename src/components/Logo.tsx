interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  // Logo image native aspect ratio is ~1109:1278 (≈ 0.87). Height drives width via object-contain.
  const logoSize = {
    sm: 'h-9 md:h-10',
    md: 'h-11 md:h-14',
    lg: 'h-20 md:h-24',
  }

  const titleSize = {
    sm: 'text-sm',
    md: 'text-base md:text-lg',
    lg: 'text-xl md:text-2xl',
  }

  return (
    <div className={`flex items-center gap-2 md:gap-3 ${className}`}>
      <img
        src="/HAI%20(Green)%20%20Hindu%20Association%20Ireland%20logo-01.jpg"
        alt="Hindu Association of Ireland"
        className={`${logoSize[size]} w-auto object-contain select-none rounded-2xl drop-shadow-[0_2px_6px_rgba(154,52,18,0.18)] transition-transform duration-300 ease-out hover:scale-[1.04]`}
        draggable={false}
      />

      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <span
            className={`${titleSize[size]} font-semibold tracking-tight text-orange-800`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Hindu Association of Ireland
          </span>
        </div>
      )}
    </div>
  )
}
