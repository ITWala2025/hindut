import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  House,
  CalendarBlank,
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
} from '@phosphor-icons/react'
import type { Capability } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth, ROLE_LABELS } from '@/lib/auth'
import { Logo } from '@/components/Logo'

export type AdminSectionId =
  | 'dashboard'
  | 'membership'
  | 'receipts'
  | 'events'
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

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-72 bg-linear-to-b from-orange-900 via-orange-950 to-orange-900 text-orange-50 border-orange-800"
        >
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SidebarHeader collapsed={false} />
          <SidebarNav
            collapsed={false}
            items={visibleItems}
            active={active}
            onNavigate={handleNavigate}
          />
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-orange-50 pl-1 pr-2 py-1 transition-colors">
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
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavigate('settings')}>
                  <Gear className="mr-2" size={16} /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <ArrowSquareOut className="mr-2" size={16} /> View public site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <SignOut className="mr-2" size={16} /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <div className="flex items-center gap-2">
          <Logo size="sm" showText={false} />
          <div>
            <div className="text-sm font-bold text-orange-50 leading-tight">HAI Admin</div>
            <div className="text-[10px] uppercase tracking-wider text-orange-300/80">
              Phase 1 · v0.1
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
          <button
            key={item.id}
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
          </button>
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
