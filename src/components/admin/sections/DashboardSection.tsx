import { useMemo } from 'react'
import {
  CalendarBlank,
  Users,
  Receipt,
  Image as ImageIcon,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KpiCard, SectionCard } from '@/components/admin/adminUi'
import { useEvents, upcomingOnly } from '@/hooks/useEvents'
import { useMembership } from '@/hooks/useMembership'
import { useReceipts } from '@/hooks/useReceipts'
import { useMedia } from '@/hooks/useMedia'
import { useAuth } from '@/lib/auth'
import type { AdminSectionId } from '@/components/admin/AdminLayout'

interface DashboardProps {
  onNavigate: (id: AdminSectionId) => void
}

export function DashboardSection({ onNavigate }: DashboardProps) {
  const { user } = useAuth()
  const { events } = useEvents()
  const { memberships } = useMembership()
  const { receipts } = useReceipts()
  const { media } = useMedia()

  const upcoming = useMemo(() => upcomingOnly(events).slice(0, 5), [events])
  const recentMembers = useMemo(
    () => [...memberships].sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 5),
    [memberships],
  )
  const recentReceipts = useMemo(
    () => [...receipts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [receipts],
  )

  const receiptsTotal = useMemo(
    () => receipts.reduce((sum, r) => sum + r.amount, 0),
    [receipts],
  )

  const activeMembers = memberships.filter((m) => m.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="rounded-2xl bg-linear-to-br from-orange-600 via-orange-700 to-amber-600 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Namaste, {user?.name.split(' ')[0]} 🙏
            </h2>
            <p className="text-orange-50/90 mt-1">
              Here's your snapshot for today.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => onNavigate('events')}
            className="bg-white text-orange-800 hover:bg-orange-50"
          >
            <CalendarBlank className="mr-2" size={18} weight="duotone" />
            Manage events
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active members"
          value={String(activeMembers)}
          icon={<Users size={26} weight="duotone" />}
          delta="12% vs last month"
          deltaPositive
          accent="orange"
        />
        <KpiCard
          label="Upcoming events"
          value={String(upcoming.length)}
          icon={<CalendarBlank size={26} weight="duotone" />}
          delta="3 this week"
          deltaPositive
          accent="amber"
        />
        <KpiCard
          label="Receipts issued"
          value={`€${receiptsTotal.toLocaleString()}`}
          icon={<Receipt size={26} weight="duotone" />}
          delta={`${receipts.length} receipts`}
          deltaPositive
          accent="green"
        />
        <KpiCard
          label="Media assets"
          value={String(media.length)}
          icon={<ImageIcon size={26} weight="duotone" />}
          delta="Library"
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming events */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Upcoming events"
            description="Next 5 events on the public calendar."
            actions={
              <Button variant="outline" size="sm" onClick={() => onNavigate('events')}>
                View all
              </Button>
            }
          >
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((e) => (
                  <li key={e.id} className="py-3 flex items-start gap-3">
                    <div className="shrink-0 w-14 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">
                        {new Date(e.date).toLocaleString('en-IE', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold text-orange-900 leading-none">
                        {new Date(e.date).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.time ? `${e.time} · ` : ''}
                        {e.location}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-orange-300 text-orange-700 capitalize"
                    >
                      {e.category}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Recent receipts */}
        <SectionCard
          title="Recent receipts"
          actions={
            <Button variant="outline" size="sm" onClick={() => onNavigate('receipts')}>
              All receipts
            </Button>
          }
        >
          <ul className="space-y-3">
            {recentReceipts.map((r) => (
              <li key={r.id} className="flex items-start gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{r.recipientName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.description} · {r.date}
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-700">
                  €{r.amount.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Recent members */}
      <SectionCard
        title="Latest memberships"
        description="People who joined via the mock payment workflow."
        actions={
          <Button variant="outline" size="sm" onClick={() => onNavigate('membership')}>
            All members
          </Button>
        }
      >
        {recentMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No memberships yet. Join from the public site to populate this list.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentMembers.map((m) => (
              <li key={m.id} className="py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-linear-to-br from-orange-200 to-amber-200 text-orange-800 font-semibold flex items-center justify-center">
                  {m.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{m.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.email} · {m.planId.replace('-', ' ')} plan
                  </div>
                </div>
                <Badge
                  className={
                    m.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'
                  }
                >
                  {m.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* spacer */}
    </div>
  )
}
