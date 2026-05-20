import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetClose, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  List,
  Heart,
  House,
  Info,
  Sparkle,
  CalendarBlank,
  IdentificationCard,
  Envelope,
  ArrowRight,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'

interface HeaderProps {
  onDonateClick: () => void
}

const NAV_ITEMS = [
  { path: '/',           label: 'Home',       icon: <House             size={18} weight="duotone" /> },
  { path: '/about',      label: 'About Us',   icon: <Info              size={18} weight="duotone" /> },
  { path: '/services',   label: 'Services',   icon: <Sparkle           size={18} weight="duotone" /> },
  { path: '/events',     label: 'Events',     icon: <CalendarBlank     size={18} weight="duotone" /> },
  { path: '/membership', label: 'Membership', icon: <IdentificationCard size={18} weight="duotone" /> },
  { path: '/contact',    label: 'Contact',    icon: <Envelope          size={18} weight="duotone" /> },
]

export function Header({ onDonateClick }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleMobileNav = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <header className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div
        className={cn(
          'relative rounded-full transition-all duration-300',
          // Glossy glass base
          'bg-white/80 backdrop-blur-2xl',
          // Border
          'border border-orange-200/50',
          // Multi-layer shadow — deepens on scroll
          scrolled
            ? 'shadow-[0_12px_40px_-8px_rgba(154,52,18,0.22),0_4px_12px_-4px_rgba(154,52,18,0.12),0_1px_0_0_rgba(255,255,255,0.9)_inset]'
            : 'shadow-[0_6px_24px_-6px_rgba(154,52,18,0.16),0_1px_0_0_rgba(255,255,255,0.9)_inset]',
        )}
      >
        {/* ── Top-lit gloss sheen ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-linear-to-b from-white/55 to-transparent" />
        {/* ── Top highlight edge ── */}
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px rounded-full bg-linear-to-r from-transparent via-white/95 to-transparent" />
        {/* ── Bottom inner rim ── */}
        <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px rounded-full bg-linear-to-r from-transparent via-orange-200/40 to-transparent" />

        <div className="relative px-4 md:px-6 lg:px-8">
          <div className="flex h-[60px] md:h-[68px] items-center justify-between gap-4">

            {/* ── Logo ── */}
            <Link
              to="/"
              className="shrink-0 transition-all hover:opacity-90 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-xl"
              aria-label="Hindu Temple Limerick — Home"
            >
              <Logo size="md" showText={true} />
            </Link>

            {/* ── Desktop nav ── */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1" aria-label="Primary">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative px-3 lg:px-4 py-2 rounded-full text-[14px] lg:text-[15px] font-semibold tracking-wide transition-all duration-150',
                      active
                        ? 'text-orange-700 bg-orange-100/70 shadow-[0_1px_4px_rgba(234,88,12,0.15)_inset]'
                        : 'text-slate-600 hover:text-orange-700 hover:bg-orange-50/70',
                    )}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 h-[3px] w-3 rounded-full bg-linear-to-r from-orange-500 to-amber-400" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* ── Desktop Donate CTA ── */}
            <div className="hidden md:flex items-center shrink-0">
              <Button
                onClick={onDonateClick}
                className={cn(
                  'rounded-full h-9 lg:h-10 px-5 lg:px-6 text-sm font-semibold',
                  'bg-linear-to-r from-orange-500 to-amber-500 text-white',
                  'shadow-[0_4px_14px_-2px_rgba(234,88,12,0.45),0_1px_0_0_rgba(255,255,255,0.30)_inset]',
                  'hover:from-orange-600 hover:to-amber-600 hover:shadow-[0_6px_20px_-2px_rgba(234,88,12,0.55)]',
                  'transition-all duration-200 active:scale-[0.97]',
                )}
              >
                <Heart className="mr-1.5" size={15} weight="fill" />
                Donate
              </Button>
            </div>

            {/* ── Mobile hamburger (opens only) ── */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9 rounded-full text-orange-700 hover:bg-orange-100/70 focus-visible:ring-orange-400"
                  aria-label="Open navigation menu"
                >
                  <List size={22} weight="bold" />
                </Button>
              </SheetTrigger>

              {/* ── Mobile drawer ── */}
              <SheetContent
                side="left"
                className="w-[300px] p-0 flex flex-col overflow-hidden bg-white border-r-0 shadow-2xl [&>button]:hidden"
              >
                <SheetTitle className="sr-only">Site navigation</SheetTitle>

                {/* Drawer branded header */}
                <div className="relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-linear-to-br from-orange-600 via-orange-500 to-amber-500" />
                  <div className="absolute inset-0 bg-linear-to-b from-white/30 via-white/5 to-transparent pointer-events-none" />
                  <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent" />
                  <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-700/20 blur-2xl" />

                  <div className="relative z-10 px-5 py-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden ring-2 ring-white/40 shadow-lg shrink-0 bg-white/15 flex items-center justify-center">
                        <Logo size="sm" showText={false} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[17px] font-bold text-white leading-tight drop-shadow-sm truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                          Hindu Temple
                        </p>
                        <p className="text-[11px] font-medium text-orange-100/80 tracking-widest uppercase mt-0.5">
                          Limerick, Ireland
                        </p>
                      </div>
                    </div>
                    {/* ── Close button inside drawer ── */}
                    <SheetClose asChild>
                      <button
                        className="shrink-0 h-8 w-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        aria-label="Close menu"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </SheetClose>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5" aria-label="Mobile navigation">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.path)
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleMobileNav(item.path)}
                        className={cn(
                          'group w-full flex items-center gap-3 rounded-xl px-3 py-[11px] text-sm font-semibold transition-all duration-150',
                          active
                            ? 'bg-linear-to-r from-orange-500/12 to-amber-400/8 text-orange-800 ring-1 ring-orange-300/40'
                            : 'text-slate-600 hover:bg-orange-50 hover:text-orange-800',
                        )}
                      >
                        <span className={cn(
                          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                          active
                            ? 'bg-orange-500/15 text-orange-600'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-orange-100/70 group-hover:text-orange-600',
                        )}>
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        {active
                          ? <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                          : <ArrowRight size={14} className="text-slate-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-orange-400 transition-all" />
                        }
                      </button>
                    )
                  })}
                </nav>

                {/* Donate CTA */}
                <div className="px-4 py-5 border-t border-slate-100 shrink-0 bg-slate-50/60 space-y-2">
                  <Button
                    onClick={() => { onDonateClick(); setIsOpen(false) }}
                    className={cn(
                      'w-full rounded-xl h-11 font-semibold text-white',
                      'bg-linear-to-r from-orange-500 to-amber-500',
                      'shadow-[0_4px_14px_-2px_rgba(234,88,12,0.35),0_1px_0_0_rgba(255,255,255,0.20)_inset]',
                      'hover:from-orange-600 hover:to-amber-600 hover:shadow-[0_6px_20px_-2px_rgba(234,88,12,0.45)]',
                      'transition-all duration-200 active:scale-[0.98]',
                    )}
                  >
                    <Heart className="mr-2" size={16} weight="fill" />
                    Make a Donation
                  </Button>
                  <p className="text-center text-[11px] text-slate-400 leading-snug">
                    Supporting the Hindu community across Ireland
                  </p>
                </div>
              </SheetContent>
            </Sheet>

          </div>
        </div>
      </div>
    </header>
  )
}
