import { useMemo, useState } from 'react'
import {
  MagnifyingGlass,
  DownloadSimple,
  XCircle,
  Trash,
  Users,
  UserPlus,
  Clock,
  ArrowsClockwise,
  ArrowCounterClockwise,
  DotsThree,
  CheckCircle,
  Crown,
  Envelope,
  Phone,
  CalendarBlank,
  CalendarCheck,
  CaretLeft,
  CaretRight,
  X,
  TrendUp,
  Funnel,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useMembership, useMemberPaymentHistory, type DonationHistoryEntry } from '@/hooks/useMembership'
import { useReceiptFlags } from '@/hooks/useReceipts'
import { downloadReceiptPdf } from '@/lib/receiptPdf'
import { useAuth } from '@/lib/auth'
import { type MembershipPlanId, type MembershipRecord } from '@/data/membership'
import { KpiCard, SectionCard, EmptyState } from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'expired' | 'pending'
type PlanFilter = 'all' | MembershipPlanId

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const STATUS_STYLES: Record<MembershipRecord['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
}

const AVATAR_COLORS = [
  'from-orange-500 to-amber-500',
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-rose-500 to-pink-500',
]

function avatarColor(id: string) {
  const code = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

/** Returns the ISO date (YYYY-MM-DD) of the first day of the month AFTER startDateStr. */
function monthlyBillingStart(startDateStr: string): string {
  if (!startDateStr) return '—'
  const d = new Date(startDateStr + 'T00:00:00Z')
  if (isNaN(d.getTime())) return '—'
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)
}

/** Returns 'Trial' if today is still before billing start, 'Active billing' otherwise. */
function monthlySubStatus(startDateStr: string): 'trial' | 'active' {
  const billingStart = monthlyBillingStart(startDateStr)
  if (billingStart === '—') return 'active'
  return new Date() < new Date(billingStart + 'T00:00:00Z') ? 'trial' : 'active'
}

// ── Payment Timeline ──────────────────────────────────────────────────────────

interface TimelineEntry {
  key:       string
  date:      string  // YYYY-MM-DD
  amountEur: number
  type:      'annual' | 'monthly'
  status:    'paid' | 'scheduled' | 'failed' | 'refunded'
  label:     string
}

function deriveUpcomingMonthly(
  member: MembershipRecord,
  paidDates: Set<string>,
): TimelineEntry[] {
  if (!member.monthlyContributionEur || !member.monthlyStripeSubId) return []

  const startParts = member.startDate
    ? member.startDate.split('-').map(Number)
    : null
  if (!startParts || startParts.length < 3) return []
  const billingStart = new Date(Date.UTC(startParts[0], startParts[1], 1))

  const expiresOn = member.expiresOn
    ? new Date(member.expiresOn + 'T00:00:00Z')
    : null
  const cutoff = expiresOn ?? new Date(Date.UTC(
    billingStart.getUTCFullYear(),
    billingStart.getUTCMonth() + 6,
    1,
  ))

  const today   = new Date()
  const entries: TimelineEntry[] = []
  let   d       = new Date(billingStart)

  while (d <= cutoff && entries.length < 12) {
    const dateStr = d.toISOString().slice(0, 10)
    if (d > today && !paidDates.has(dateStr)) {
      entries.push({
        key:       `monthly-upcoming-${dateStr}`,
        date:      dateStr,
        amountEur: member.monthlyContributionEur,
        type:      'monthly',
        status:    'scheduled',
        label:     'Monthly contribution',
      })
    }
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  }
  return entries
}

function PaymentTimeline({
  member,
  planPrice,
  planName,
}: {
  member:    MembershipRecord
  planPrice: number
  planName:  string
}) {
  const { history, loading } = useMemberPaymentHistory(member.monthlyStripeSubId)

  const entries = useMemo<TimelineEntry[]>(() => {
    const today = new Date()
    const all: TimelineEntry[] = []

    if (member.startDate) {
      all.push({
        key:       'annual-paid',
        date:      member.startDate,
        amountEur: planPrice,
        type:      'annual',
        status:    'paid',
        label:     `${planName} membership`,
      })
    }

    if (member.expiresOn && new Date(member.expiresOn + 'T00:00:00Z') > today) {
      all.push({
        key:       'annual-renewal',
        date:      member.expiresOn,
        amountEur: planPrice,
        type:      'annual',
        status:    'scheduled',
        label:     `${planName} membership renewal`,
      })
    }

    for (const h of history) {
      all.push({
        key:       h.id,
        date:      h.date,
        amountEur: h.amountEur,
        type:      'monthly',
        status:    h.status === 'succeeded' ? 'paid' : h.status,
        label:     'Monthly contribution',
      })
    }

    const paidDates = new Set(history.map((h) => h.date))
    for (const u of deriveUpcomingMonthly(member, paidDates)) {
      all.push(u)
    }

    return all.sort((a, b) => a.date.localeCompare(b.date))
  }, [member, planPrice, planName, history])

  const ENTRY_STYLES: Record<TimelineEntry['status'], { dot: string; badge: string; label: string }> = {
    paid:      { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',  label: 'Paid'      },
    scheduled: { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200',           label: 'Scheduled' },
    failed:    { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',              label: 'Failed'    },
    refunded:  { dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 border-slate-200',        label: 'Refunded'  },
  }

  if (loading) {
    return <div className="text-xs text-slate-400 py-4 text-center">Loading payment history…</div>
  }

  if (entries.length === 0) {
    return <div className="text-xs text-slate-400 py-4 text-center">No payment records yet.</div>
  }

  return (
    <div className="relative">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
      <div className="space-y-3">
        {entries.map((e) => {
          const s = ENTRY_STYLES[e.status]
          const isUpcoming = e.status === 'scheduled'
          return (
            <div key={e.key} className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shrink-0 z-10',
                  s.dot,
                  isUpcoming && 'opacity-60',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={cn('text-sm font-medium', isUpcoming ? 'text-slate-400' : 'text-slate-800')}>
                    {e.label}
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border',
                    s.badge,
                  )}>
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">{e.date}</span>
                  <span className={cn('text-xs font-bold', isUpcoming ? 'text-slate-400' : 'text-slate-700')}>
                    €{e.amountEur.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{e.type}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Member Detail Panel ───────────────────────────────────────────────────────

function MemberDetailSheet({
  member,
  onClose,
  onStatusChange,
  onCancel,
  onRenew,
  onDelete,
  canWrite,
  planPrice,
  planName,
}: {
  member: MembershipRecord | null
  onClose: () => void
  onStatusChange: (id: string, status: MembershipRecord['status']) => void
  onCancel: (id: string) => void
  onRenew: (id: string) => void
  onDelete: (id: string) => void
  canWrite: boolean
  planPrice: number
  planName:  string
}) {
  if (!member) return null
  return (
    <Sheet open={!!member} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-white border-l border-slate-200">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="bg-linear-to-br from-slate-800 to-slate-900 p-6 text-white">
            <SheetHeader className="mb-4">
              <SheetTitle className="sr-only">Member details</SheetTitle>
              <SheetDescription className="sr-only">
                View and manage member record
              </SheetDescription>
            </SheetHeader>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl bg-linear-to-br flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0',
                  avatarColor(member.id),
                )}
              >
                {initials(member.fullName)}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold leading-tight truncate">{member.fullName}</div>
                <div className="text-slate-300 text-sm mt-0.5 truncate">{member.email}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                      STATUS_STYLES[member.status],
                    )}
                  >
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {member.planId.replace('-', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6 flex-1">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Contact
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-sm">
                  <Envelope size={15} weight="duotone" className="text-slate-400 shrink-0" />
                  <span className="text-slate-700 truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone size={15} weight="duotone" className="text-slate-400 shrink-0" />
                    <span className="text-slate-700">{member.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Membership
              </h4>
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                <div className="text-xs text-orange-600 mb-0.5">Member ID</div>
                {member.memberCode ? (
                  <div className="font-mono text-sm font-bold text-orange-800">{member.memberCode}</div>
                ) : (
                  <div className="text-sm text-slate-400 italic">— pending (assigned after first payment)</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Plan', value: member.planId.replace('-', ' ') },
                  { label: 'Status', value: member.status },
                  { label: 'Start date', value: member.startDate || '—' },
                  { label: 'Expires', value: member.expiresOn || '—' },
                  { label: 'Reference', value: member.reference },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-slate-800 capitalize truncate">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {member.monthlyContributionEur && (
              <>
                <Separator className="bg-slate-100" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                      Monthly Contribution
                    </h4>
                    {(() => {
                      const subStatus = monthlySubStatus(member.startDate)
                      return (
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border',
                          subStatus === 'trial'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        )}>
                          {subStatus === 'trial' ? 'Trial period' : 'Active billing'}
                        </span>
                      )
                    })()}
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-3">
                    {/* Amount highlight */}
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                      <span className="text-sm text-amber-700 font-medium">Monthly amount</span>
                      <span className="text-base font-bold text-amber-900">€{member.monthlyContributionEur}/month</span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div>
                        <div className="text-amber-600 mb-0.5">Opted in</div>
                        <div className="font-semibold text-amber-900">{member.startDate || '—'}</div>
                      </div>
                      <div>
                        <div className="text-amber-600 mb-0.5">Subscription starts</div>
                        <div className="font-semibold text-amber-900">{monthlyBillingStart(member.startDate)}</div>
                      </div>
                      <div>
                        <div className="text-amber-600 mb-0.5">Billing cycle</div>
                        <div className="font-semibold text-amber-900">1st of each month</div>
                      </div>
                      <div>
                        <div className="text-amber-600 mb-0.5">Payment method</div>
                        <div className="font-semibold text-amber-900 capitalize">{member.paymentMethod}</div>
                      </div>
                    </div>

                    {/* Stripe sub ID */}
                    {member.monthlyStripeSubId && (
                      <div className="pt-1 border-t border-amber-100">
                        <div className="text-xs text-amber-600 mb-0.5">Stripe Subscription ID</div>
                        <div className="font-mono text-xs text-amber-700 truncate">{member.monthlyStripeSubId}</div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 pt-0.5">
                      Auto-charged monthly via Stripe. Trial runs until the subscription start date; no charge during trial.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Payment History & Schedule */}
            <Separator className="bg-slate-100" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarCheck size={14} weight="bold" className="text-slate-500" />
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Payment History &amp; Schedule
                </h4>
              </div>
              <PaymentTimeline
                member={member}
                planPrice={planPrice}
                planName={planName}
              />
            </div>

          </div>

          {/* Actions footer */}
          {canWrite && (
            <div className="border-t border-slate-100 p-6 space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Actions
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {member.status !== 'active' && (
                  <Button
                    size="sm"
                    onClick={() => { onStatusChange(member.id, 'active'); onClose(); toast.success(`${member.fullName} marked active.`) }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    Mark active
                  </Button>
                )}
                {member.status !== 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { onStatusChange(member.id, 'pending'); onClose(); toast.success(`${member.fullName} marked pending.`) }}
                    className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Clock size={14} className="mr-1.5" />
                    Mark pending
                  </Button>
                )}
                {member.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { onCancel(member.id); onClose(); toast.success(`Cancelled ${member.fullName}.`) }}
                    className="rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Cancel
                  </Button>
                )}
                {member.status === 'expired' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { onRenew(member.id); onClose(); toast.success(`Renewed ${member.fullName}.`) }}
                    className="rounded-xl border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <ArrowCounterClockwise size={14} className="mr-1.5" />
                    Renew
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onDelete(member.id); onClose(); toast.success(`Removed ${member.fullName}.`) }}
                className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <Trash size={14} className="mr-1.5" />
                Delete member record
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main Section ──────────────────────────────────────────────────────────────

export function MembersSection() {
  const { can } = useAuth()
  const { memberships, plans, getPlan, cancel, remove, setStatus, syncStripe } = useMembership()
  const { flags: receiptFlags, fetchReceiptById } = useReceiptFlags('membership')
  const canCreate = can('members:create')
  const canUpdate = can('members:update')
  const canDelete = can('members:delete')
  const canWrite = canCreate || canUpdate || canDelete

  const handleDownloadReceipt = async (membershipId: string) => {
    const flag = receiptFlags.get(membershipId)
    if (!flag) { toast.error('No receipt generated yet for this membership.'); return }
    const r = await fetchReceiptById(flag.id)
    if (!r) { toast.error('Could not load receipt.'); return }
    downloadReceiptPdf(r)
  }

  const [search, setSearch] = useState('')
  const [status, setStatusFilter] = useState<StatusFilter>('all')
  const [plan, setPlan] = useState<PlanFilter>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [detailMember, setDetailMember] = useState<MembershipRecord | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const pageSize = 10

  const filtered = useMemo(() => {
    return memberships.filter((m) => {
      if (status !== 'all' && m.status !== status) return false
      if (plan !== 'all' && m.planId !== plan) return false
      if (fromDate && m.startDate < fromDate) return false
      if (toDate && m.startDate > toDate) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.reference.toLowerCase().includes(q) ||
        (m.memberCode ?? '').toLowerCase().includes(q) ||
        (m.stripeCustomerId ?? '').toLowerCase().includes(q)
      )
    })
  }, [memberships, search, status, plan, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const counts = useMemo(
    () => ({
      total: memberships.length,
      active: memberships.filter((m) => m.status === 'active').length,
      expired: memberships.filter((m) => m.status === 'expired').length,
      pending: memberships.filter((m) => m.status === 'pending').length,
    }),
    [memberships],
  )

  // Tier distribution
  const tierDist = useMemo(() => {
    const dist: Record<string, number> = {}
    memberships.forEach((m) => {
      dist[m.planId] = (dist[m.planId] ?? 0) + 1
    })
    return dist
  }, [memberships])

  const runSync = async () => {
    if (!canWrite) { toast.error("You don't have permission to sync Stripe data."); return }
    setSyncing(true)
    try {
      await syncStripe()
      const ts = new Date().toLocaleTimeString('en-IE')
      setLastSync(ts)
      toast.success(`Stripe sync complete (${ts}).`)
    } catch {
      toast.error('Stripe sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  const exportCsv = () => {
    if (filtered.length === 0) { toast.error('No members to export.'); return }
    const header = ['Member ID', 'Name', 'Email', 'Phone', 'Plan', 'Start', 'Expires', 'Status', 'Method', 'Reference', 'Stripe Customer']
    const rows = filtered.map((m) => [
      m.memberCode ?? '', m.fullName, m.email, m.phone ?? '', m.planId, m.startDate,
      m.expiresOn, m.status, m.paymentMethod, m.reference, m.stripeCustomerId ?? '',
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported member list.')
  }

  const activeFilters = [
    status !== 'all' && `Status: ${status}`,
    plan !== 'all' && `Plan: ${plan}`,
    fromDate && `From: ${fromDate}`,
    toDate && `To: ${toDate}`,
  ].filter(Boolean)

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total members"
          value={String(counts.total)}
          icon={<Users size={22} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Active"
          value={String(counts.active)}
          icon={<UserPlus size={22} weight="duotone" />}
          accent="green"
          delta={counts.active > 0 ? `${Math.round((counts.active / Math.max(counts.total, 1)) * 100)}% of total` : undefined}
          deltaPositive
        />
        <KpiCard
          label="Pending"
          value={String(counts.pending)}
          icon={<Clock size={22} weight="duotone" />}
          accent="amber"
        />
        <KpiCard
          label="Expired"
          value={String(counts.expired)}
          icon={<TrendUp size={22} weight="duotone" />}
          accent="red"
        />
      </div>

      {/* ── Tier Distribution ───────────────────────────────────────────── */}
      {counts.total > 0 && (
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Crown size={16} weight="duotone" className="text-orange-500" />
                Plan distribution
              </h3>
              <span className="text-xs text-slate-400">{counts.total} total</span>
            </div>
            <div className="flex gap-2 h-2 rounded-full overflow-hidden mb-3">
              {plans.map((p, i) => {
                const count = tierDist[p.id] ?? 0
                const pct = (count / counts.total) * 100
                const colors = [
                  'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
                ]
                return pct > 0 ? (
                  <div
                    key={p.id}
                    className={cn('rounded-full transition-all', colors[i % colors.length])}
                    style={{ width: `${pct}%` }}
                    title={`${p.name}: ${count}`}
                  />
                ) : null
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              {plans.map((p, i) => {
                const count = tierDist[p.id] ?? 0
                const pct = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0
                const dotColors = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500']
                return (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className={cn('w-2 h-2 rounded-full', dotColors[i % dotColors.length])} />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main Management Card ─────────────────────────────────────────── */}
      <SectionCard
        title="Membership management"
        description="Search, filter and manage all members synced with Stripe."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
              className={cn(
                'rounded-xl border-slate-300',
                showFilters && 'bg-slate-100 border-slate-400',
              )}
            >
              <Funnel size={15} className="mr-1.5" />
              Filters
              {activeFilters.length > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="rounded-xl border-slate-300"
            >
              <DownloadSimple size={15} className="mr-1.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={runSync}
              disabled={syncing || !canWrite}
              className="bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-semibold"
            >
              <ArrowsClockwise
                size={15}
                weight="bold"
                className={cn('mr-1.5', syncing && 'animate-spin')}
              />
              {syncing ? 'Syncing…' : 'Sync Stripe'}
            </Button>
          </>
        }
      >
        {/* Last sync indicator */}
        {lastSync && (
          <div className="mb-4 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 w-fit">
            <CheckCircle size={13} weight="fill" />
            Last synced at {lastSync}
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-3">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            placeholder="Search name, email, reference, Stripe ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <Label className="text-[11px] text-slate-500 mb-1 block">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1) }}>
                <SelectTrigger className="h-9 rounded-xl text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-slate-500 mb-1 block">Plan</Label>
              <Select value={plan} onValueChange={(v) => { setPlan(v as PlanFilter); setPage(1) }}>
                <SelectTrigger className="h-9 rounded-xl text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-slate-500 mb-1 block">Start from</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
                className="h-9 rounded-xl text-sm border-slate-200"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-500 mb-1 block">Start to</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1) }}
                className="h-9 rounded-xl text-sm border-slate-200"
              />
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeFilters.map((f) => (
              <span
                key={String(f)}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-xs px-2.5 py-1 font-medium"
              >
                {f}
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all')
                setPlan('all')
                setFromDate('')
                setToDate('')
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No members found"
            description="Adjust your filters or wait for new memberships to be created via the public site."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Plan
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Expires
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">
                      Member ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Receipt
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((m, idx) => (
                    <tr
                      key={m.id}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer',
                        idx === pageRows.length - 1 && 'border-b-0',
                      )}
                      onClick={() => setDetailMember(m)}
                    >
                      {/* Member cell */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-xl bg-linear-to-br flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm',
                              avatarColor(m.id),
                            )}
                          >
                            {initials(m.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{m.fullName}</div>
                            <div className="text-xs text-slate-500 truncate">{m.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <CalendarBlank size={13} weight="duotone" className="text-orange-400" />
                          <span className="capitalize text-slate-700 text-xs">
                            {m.planId.replace('-', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3.5 text-slate-600 text-xs hidden lg:table-cell">
                        {m.expiresOn || '—'}
                      </td>

                      {/* Member ID */}
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        {m.memberCode ? (
                          <span className="font-mono text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-0.5">
                            {m.memberCode}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">— pending</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                            STATUS_STYLES[m.status],
                          )}
                        >
                          {m.status}
                        </span>
                      </td>

                      {/* Receipt */}
                      <td className="px-4 py-3.5 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        {receiptFlags.has(m.id) ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(m.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-mono font-semibold hover:bg-emerald-700"
                            title="Download receipt PDF"
                          >
                            <DownloadSimple size={11} weight="bold" /> {receiptFlags.get(m.id)?.receiptNumber}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canWrite}
                              className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100"
                              aria-label="Member actions"
                            >
                              <DotsThree size={18} weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200">
                            <DropdownMenuItem
                              onClick={() => setDetailMember(m)}
                              className="rounded-lg"
                            >
                              <Crown className="mr-2" size={15} /> View details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {m.status !== 'active' && (
                              <DropdownMenuItem
                                onClick={() => { setStatus(m.id, 'active'); toast.success(`Marked ${m.fullName} as active.`) }}
                                className="rounded-lg"
                              >
                                <CheckCircle className="mr-2" size={15} /> Mark active
                              </DropdownMenuItem>
                            )}
                            {m.status !== 'pending' && (
                              <DropdownMenuItem
                                onClick={() => { setStatus(m.id, 'pending'); toast.success(`Marked ${m.fullName} as pending.`) }}
                                className="rounded-lg"
                              >
                                <Clock className="mr-2" size={15} /> Mark pending
                              </DropdownMenuItem>
                            )}
                            {m.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => { cancel(m.id); toast.success(`Cancelled ${m.fullName}.`) }}
                                className="rounded-lg"
                              >
                                <XCircle className="mr-2" size={15} /> Cancel membership
                              </DropdownMenuItem>
                            )}
                            {m.status === 'expired' && (
                              <DropdownMenuItem
                                onClick={() => { setStatus(m.id, 'active'); toast.success(`Renewed ${m.fullName}.`) }}
                                className="rounded-lg"
                              >
                                <ArrowCounterClockwise className="mr-2" size={15} /> Renew
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { remove(m.id); toast.success(`Removed ${m.fullName}.`) }}
                              className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg"
                            >
                              <Trash className="mr-2" size={15} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-700">{filtered.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 rounded-xl border-slate-200"
                >
                  <CaretLeft size={14} />
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = totalPages <= 5
                      ? i + 1
                      : safePage <= 3
                        ? i + 1
                        : safePage >= totalPages - 2
                          ? totalPages - 4 + i
                          : safePage - 2 + i
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'h-8 w-8 rounded-xl text-xs font-medium transition-all',
                          pageNum === safePage
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100',
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0 rounded-xl border-slate-200"
                >
                  <CaretRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Member detail slide-over */}
      <MemberDetailSheet
        member={detailMember}
        onClose={() => setDetailMember(null)}
        onStatusChange={setStatus}
        onCancel={cancel}
        onRenew={(id) => setStatus(id, 'active')}
        onDelete={remove}
        canWrite={canWrite}
        planPrice={getPlan(detailMember?.planId ?? '')?.price ?? 0}
        planName={getPlan(detailMember?.planId ?? '')?.name ?? detailMember?.planId ?? ''}
      />
    </div>
  )
}
