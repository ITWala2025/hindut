interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10 md:h-12 md:w-12',
    lg: 'h-16 w-16 md:h-20 md:w-20'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base md:text-xl',
    lg: 'text-xl md:text-2xl'
  }

  const omSizeClasses = {
    sm: 'text-base',
    md: 'text-xl md:text-2xl',
    lg: 'text-3xl md:text-4xl'
  }

  return (
    <div className={`flex items-center space-x-2 md:space-x-3 ${className}`}>
      {/* Stunning Logo Icon */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className={`${sizeClasses[size]} absolute -inset-2 rounded-full bg-linear-to-r from-orange-400 via-amber-500 to-orange-400 opacity-30 blur-md animate-pulse`} />

        {/* Main logo circle */}
        <div className={`${sizeClasses[size]} relative flex items-center justify-center rounded-full bg-linear-to-br from-orange-500 via-amber-500 to-orange-600 shadow-xl glow-saffron-intense`}>
          {/* Inner decorative ring */}
          <div className="absolute inset-1 rounded-full border-2 border-white/30" />

          {/* Om symbol with enhanced styling */}
          <span className={`${omSizeClasses[size]} font-bold text-white relative z-10`} style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            textShadow: '0 0 10px rgba(255,255,255,0.5)'
          }}>
            ॐ
          </span>

          {/* Sparkle effect */}
          <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-white/80 animate-pulse" />
        </div>
      </div>

      {/* Temple Name */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`${textSizeClasses[size]} font-bold leading-tight bg-linear-to-r from-orange-700 via-orange-800 to-amber-700 bg-clip-text text-transparent`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Hindu Temple
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="h-px w-4 bg-linear-to-r from-transparent via-orange-400 to-transparent" />
            <span className="text-[10px] text-orange-600/80 font-medium tracking-wider">HINDU ASSOCIATION OF IRELAND</span>
            <div className="h-px w-4 bg-linear-to-r from-transparent via-orange-400 to-transparent" />
          </div>
        </div>
      )}
    </div>
  )
}
