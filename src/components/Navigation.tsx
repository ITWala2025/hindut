import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
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
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'

interface NavigationProps {
  onDonateClick: () => void
}

export function Navigation({ onDonateClick }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/', label: 'Home', icon: <House size={18} weight="duotone" /> },
    { path: '/about', label: 'About Us', icon: <Info size={18} weight="duotone" /> },
    { path: '/services', label: 'Services', icon: <Sparkle size={18} weight="duotone" /> },
    { path: '/events', label: 'Events', icon: <CalendarBlank size={18} weight="duotone" /> },
    { path: '/membership', label: 'Membership', icon: <IdentificationCard size={18} weight="duotone" /> },
    { path: '/contact', label: 'Contact', icon: <Envelope size={18} weight="duotone" /> },
  ]

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleMobileClick = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <nav className="fixed top-4 md:top-8 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl rounded-full border border-orange-200/40 bg-linear-to-r from-orange-50/95 via-amber-50/95 to-orange-50/95 backdrop-blur-xl shadow-2xl shadow-orange-900/20 glow-saffron">
      <div className="px-4 md:px-8 lg:px-12">
        <div className="flex h-16 md:h-20 items-center justify-between">
          <Link
            to="/"
            className="transition-all hover:opacity-90 hover:scale-105"
          >
            <Logo size="md" showText={true} />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative text-[15px] font-semibold tracking-wide transition-all",
                  isActive(item.path)
                    ? "text-orange-700 after:absolute after:bottom-[-8px] after:left-0 after:h-1 after:w-full after:bg-linear-to-r after:from-orange-500 after:to-amber-500 after:rounded-full after:shadow-lg after:shadow-orange-500/50"
                    : "text-orange-600/80 hover:text-orange-700 hover:scale-105"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button
              onClick={onDonateClick}
              className="rounded-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover:scale-105 transition-all hover-glow-saffron font-semibold"
            >
              <Heart className="mr-2" weight="fill" />
              Donate
            </Button>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-orange-700">
                <List className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] p-0 flex flex-col overflow-hidden bg-white border-r border-slate-200"
            >
              <SheetTitle className="sr-only">Site navigation</SheetTitle>

              {/* Branded header */}
              <div className="relative overflow-hidden bg-linear-to-br from-orange-600 via-orange-600 to-amber-600 px-5 pt-7 pb-6 shrink-0">
                {/* Gloss sheen — top-lit highlight */}
                <div className="absolute inset-0 bg-linear-to-b from-white/25 via-white/8 to-transparent pointer-events-none" />
                {/* Highlight edge */}
                <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/60 to-transparent" />
                {/* Decorative orbs */}
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-orange-400/20 blur-2xl" />

                {/* Logo + title */}
                <div className="relative z-10 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/20 ring-1 ring-white/40 shadow-lg shadow-orange-900/30 shrink-0 flex items-center justify-center">
                    <Logo size="sm" showText={false} />
                  </div>
                  <div>
                    <h2
                      className="text-[17px] font-extrabold text-white leading-tight drop-shadow-[0_1px_3px_rgba(180,60,0,0.5)]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Hindu Temple
                    </h2>
                  </div>
                </div>

                {/* Tagline */}

                {/* Bottom gloss edge */}
                <div className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                {navItems.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleMobileClick(item.path)}
                      className={cn(
                        'group w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-150',
                        active
                          ? 'bg-linear-to-r from-orange-500/15 to-amber-400/10 text-orange-800 ring-1 ring-orange-300/40'
                          : 'text-slate-600 hover:bg-orange-50/80 hover:text-orange-800',
                      )}
                    >
                      <span
                        className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          active
                            ? 'bg-orange-500/20 text-orange-700'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600',
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {active ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                      ) : (
                        <ArrowRight
                          size={14}
                          className="text-slate-300 group-hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0"
                        />
                      )}
                    </button>
                  )
                })}
              </nav>

              {/* Donate CTA footer */}
              <div className="px-4 py-5 border-t border-slate-100 shrink-0 space-y-3 bg-slate-50/60">
                <Button
                  onClick={() => { onDonateClick(); setIsOpen(false) }}
                  className="w-full rounded-xl h-11 bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                >
                  <Heart className="mr-2" size={16} weight="fill" />
                  Make a Donation
                </Button>
                <p className="text-center text-[11px] text-slate-400">
                  Serving the Hindu community in Ireland
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
