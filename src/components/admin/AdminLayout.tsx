import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  House,
  CalendarBlank,
  ChartLineUp,
  ClipboardText,
  Users,
  Receipt,
  Image as ImageIcon,
  UserCircleGear,
  Gear,
  SignOut,
  List,
  CaretLeft,
  Bell,
  MagnifyingGlass,
  ArrowSquareOut,
  Sparkle,
  Ticket,
  HandCoins,
} from '@phosphor-icons/react'
import type { Capability } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import { Logo } from '@/components/Logo'

export type AdminSectionId =
  | 'dashboard'
  | 'analytics'
  | 'membership'
  | 'receipts'
  | 'events'
  | 'rsvps'
  | 'tickets'
  | 'donations'
  | 'media'
  | 'services'
  | 'users'
  | 'settings'

interface NavItem {
  id: AdminSectionId
  label: string
  icon: ReactNode
  badge?: string
  /** Capability required to even see this nav entry. */
  capability?: Capability
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: <House size={20} weight="duotone" /> },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <ChartLineUp size={20} weight="duotone" />,
    capability: 'viewAnalytics',
  },
  {
    id: 'membership',
    label: 'Membership',
    icon: <Users size={20} weight="duotone" />,
    capability: 'manageMemberships',
  },
  {
    id: 'receipts',
    label: 'Receipts',
    icon: <Receipt size={20} weight="duotone" />,
    capability: 'manageReceipts',
  },
  {
    id: 'events',
    label: 'Events',
    icon: <CalendarBlank size={20} weight="duotone" />,
    capability: 'manageEvents',
  },
  {
    id: 'media',
    label: 'Media Library',
    icon: <ImageIcon size={20} weight="duotone" />,
    capability: 'manageMedia',
  },
  {
    id: 'rsvps',
    label: 'RSVPs',
    icon: <ClipboardText size={20} weight="duotone" />,
    capability: 'manageEvents',
  },
  {
    id: 'tickets',
    label: 'Ticket Bookings',
    icon: <Ticket size={20} weight="duotone" />,
    capability: 'manageEvents',
  },
  {
    id: 'donations',
    label: 'Donations',
    icon: <HandCoins size={20} weight="duotone" />,
    capability: 'manageReceipts',
  },
  {
    id: 'services',
    label: 'Services',
    icon: <Sparkle size={20} weight="duotone" />,
    capability: 'manageServices',
  },
  {
    id: 'users',
    label: 'Team & Access',
    icon: <UserCircleGear size={20} weight="duotone" />,
    capability: 'manageUsers',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Gear size={20} weight="duotone" />,
    capability: 'manageSettings',
  },
]

interface AdminLayoutProps {
  active: AdminSectionId
  onNavigate: (id: AdminSectionId) => void
  children: ReactNode
}

export function AdminLayout({ active, onNavigate, children }: AdminLayoutProps) {
  const { user, logout, can } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter((i) => !i.capability || can(i.capability))

  const handleNavigate = (id: AdminSectionId) => {
    onNavigate(id)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-linear-to-b from-orange-900 via-orange-950 to-orange-900 text-orange-50 transition-all duration-300 sticky top-0 h-screen',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav
          collapsed={collapsed}
          items={visibleItems}
          active={active}
          onNavigate={handleNavigate}
        />
        <SidebarFooter
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Mobile sidebar — enterprise drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[300px] bg-linear-to-b from-orange-900 via-orange-950 to-orange-900 text-orange-50 border-orange-800/60 flex flex-col overflow-hidden"
        >
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>

          {/* Header */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-orange-800/50 shrink-0">
            <Logo size="sm" showText={false} />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-orange-300/80 leading-none mb-0.5">
                Admin Portal
              </div>
              <div className="text-sm font-bold text-orange-50 truncate leading-tight">
                HAI — Ireland
              </div>
            </div>
          </div>

          {/* User profile card */}
          <div className="px-3 py-3 border-b border-orange-800/40 shrink-0">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-3 ring-1 ring-white/10">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl bg-linear-to-br text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-white/20',
                  user.avatarColor,
                )}
              >
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-orange-50 truncate leading-tight">
                  {user.name}
                </div>
                <div className="text-[11px] text-orange-300/80 truncate leading-tight mt-0.5">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]" title="Online" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {visibleItems.map((item) => {
              const isActive = active === item.id
              return (
                <Link
                  key={item.id}
                  to={`/admin/${item.id}`}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-linear-to-r from-orange-500/25 to-amber-400/15 text-white shadow-sm ring-1 ring-orange-400/30'
                      : 'text-orange-200/80 hover:bg-white/8 hover:text-white',
                  )}
                >
                  {/* Icon pill */}
                  <span
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      isActive
                        ? 'bg-orange-500/30 text-orange-100'
                        : 'bg-white/5 text-orange-300 group-hover:bg-white/10 group-hover:text-white',
                    )}
                  >
                    {item.icon}
                  </span>

                  <span className="flex-1 truncate">{item.label}</span>

                  {item.badge && (
                    <Badge className="bg-amber-500 text-white text-[10px] h-4 px-1.5 leading-none">
                      {item.badge}
                    </Badge>
                  )}

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer actions */}
          <div className="border-t border-orange-800/50 p-2 space-y-0.5 shrink-0">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm text-orange-200/80 hover:bg-white/8 hover:text-white transition-all duration-150"
            >
              <span className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-orange-300 group-hover:bg-white/10 group-hover:text-white transition-colors">
                <ArrowSquareOut size={18} />
              </span>
              <span className="flex-1">View public site</span>
            </Link>
            <button
              onClick={() => { logout(); setMobileOpen(false) }}
              className="group w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm text-orange-200/80 hover:bg-red-500/20 hover:text-red-200 transition-all duration-150"
            >
              <span className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-orange-300 group-hover:bg-red-400/30 group-hover:text-red-200 transition-colors">
                <SignOut size={18} />
              </span>
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 md:px-6 lg:px-8 h-16">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-orange-800"
                  aria-label="Open navigation"
                >
                  <List size={22} />
                </Button>
              </SheetTrigger>
            </Sheet>

            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Admin portal
              </div>
              <h1
                className="text-lg md:text-xl font-bold text-orange-900 truncate"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {NAV_ITEMS.find((i) => i.id === active)?.label ?? 'Dashboard'}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search events, members…"
                  className="pl-9 bg-slate-50 border-slate-200 h-9"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-orange-800 relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            </Button>

            <Link
              to="/"
              className="hidden md:inline-flex items-center gap-1.5 text-sm text-orange-800 hover:text-orange-900 hover:underline"
            >
              <ArrowSquareOut size={16} />
              Public site
            </Link>

<div className="flex items-center gap-2 pl-1 pr-2 py-1">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-full bg-linear-to-br text-white font-semibold flex items-center justify-center',
                      user.avatarColor,
                    )}
                  >
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-semibold text-orange-900 leading-tight">
                      {user.name}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {ROLE_LABELS[user.role]}
                    </div>
                  </div>
                </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  )
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="h-16 flex items-center px-4 border-b border-orange-800/60">
      {collapsed ? (
        <Logo size="sm" showText={false} />
      ) : (
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" showText={false} />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-orange-300/80 leading-none mb-0.5">
              Admin Portal
            </div>
            <div className="text-sm font-bold text-orange-50 truncate leading-tight">
              Hindu Association of Ireland
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarNav({
  collapsed,
  items,
  active,
  onNavigate,
}: {
  collapsed: boolean
  items: NavItem[]
  active: AdminSectionId
  onNavigate: (id: AdminSectionId) => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <Link
            key={item.id}
            to={`/admin/${item.id}`}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : undefined}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-orange-50 text-orange-900 shadow-md'
                : 'text-orange-100 hover:bg-orange-800/50 hover:text-white',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge className="bg-amber-500 text-white text-[10px] h-5 px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarFooter({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { logout, user } = useAuth()
  return (
    <div className="border-t border-orange-800/60 p-3 space-y-2">
      {!collapsed && user && (
        <div className="px-2 py-1 text-[11px] text-orange-200/80">
          Signed in as{' '}
          <span className="font-semibold text-orange-50">{ROLE_LABELS[user.role]}</span>
        </div>
      )}
      <button
        onClick={logout}
        title="Sign out"
        className={cn(
          'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-orange-100 hover:bg-red-500/20 hover:text-red-200 transition-colors',
          collapsed && 'justify-center',
        )}
      >
        <SignOut size={18} />
        {!collapsed && <span>Sign out</span>}
      </button>
      <button
        onClick={onToggleCollapse}
        className={cn(
          'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-orange-200/80 hover:bg-orange-800/50 hover:text-white transition-colors',
          collapsed && 'justify-center',
        )}
      >
        <CaretLeft
          size={16}
          className={cn('transition-transform', collapsed && 'rotate-180')}
        />
        {!collapsed && <span>Collapse</span>}
      </button>
    </div>
  )
}
