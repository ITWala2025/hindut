import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { List, Heart } from '@phosphor-icons/react'
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
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About Us' },
    { path: '/services', label: 'Services' },
    { path: '/events', label: 'Events' },
    { path: '/membership', label: 'Membership' },
    { path: '/contact', label: 'Contact' },
    { path: '/admin', label: 'Admin' },
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
            <SheetContent side="left" className="w-[300px] bg-linear-to-b from-orange-50 to-amber-50">
              <div className="flex items-center justify-between mb-8">
                <Logo size="sm" showText={true} />
              </div>
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleMobileClick(item.path)}
                    className={cn(
                      "text-left text-lg font-semibold transition-all py-2 rounded-full px-4",
                      isActive(item.path)
                        ? "text-orange-700 bg-orange-100/70 shadow-sm"
                        : "text-orange-600/80 hover:text-orange-700 hover:bg-orange-50"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
                <Button
                  onClick={() => {
                    onDonateClick()
                    setIsOpen(false)
                  }}
                  className="mt-4 rounded-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron"
                >
                  <Heart className="mr-2" weight="fill" />
                  Donate
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}