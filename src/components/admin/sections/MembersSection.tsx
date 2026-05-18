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
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { useMembership } from '@/hooks/useMembership'
import { useAuth } from '@/lib/auth'
import { type MembershipPlanId } from '@/data/membership'
import { KpiCard, SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'

type StatusFilter = 'all' | 'active' | 'expired' | 'pending'
type PlanFilter = 'all' | MembershipPlanId

export function MembersSection() {
  const { can } = useAuth()
  const { memberships, plans, cancel, remove, setStatus, syncStripe } = useMembership()
  const canWrite = can('manageMemberships')

  const [search, setSearch] = useState('')
  const [status, setStatusFilter] = useState<StatusFilter>('all')
  const [plan, setPlan] = useState<PlanFilter>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [page, setPage] = useState(1)
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

  const runSync = async () => {
    if (!canWrite) {
      toast.error("You don't have permission to sync Stripe data.")
      return
    }
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
    if (filtered.length === 0) {
      toast.error('No members to export.')
      return
    }
    const header = [
      'Name',
      'Email',
      'Phone',
      'Plan',
      'Start',
      'Expires',
      'Status',
      'Method',
      'Reference',
      'Stripe Customer',
    ]
    const rows = filtered.map((m) => [
      m.fullName,
      m.email,
      m.phone ?? '',
      m.planId,
      m.startDate,
      m.expiresOn,
      m.status,
      m.paymentMethod,
      m.reference,
      m.stripeCustomerId ?? '',
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total members"
          value={String(counts.total)}
          icon={<Users size={24} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Active"
          value={String(counts.active)}
          icon={<UserPlus size={24} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Expired"
          value={String(counts.expired)}
          icon={<Clock size={24} weight="duotone" />}
          accent="amber"
        />
        <KpiCard
          label="Pending"
          value={String(counts.pending)}
          icon={<Clock size={24} weight="duotone" />}
          accent="blue"
        />
      </div>

      <SectionCard
        title="Membership management"
        description="Search, filter and manage all members synced with Stripe."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <DownloadSimple className="mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={runSync}
              disabled={syncing || !canWrite}
              className="bg-linear-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 font-semibold"
            >
              <ArrowsClockwise
                className={`mr-2 ${syncing ? 'animate-spin' : ''}`}
                weight="bold"
              />
              {syncing ? 'Syncing…' : 'Sync Stripe'}
            </Button>
          </>
        }
      >
        {lastSync && (
          <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle size={14} weight="fill" />
            Last Stripe sync at {lastSync}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="relative lg:col-span-2">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search name, email, reference, Stripe ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={plan}
            onValueChange={(v) => {
              setPlan(v as PlanFilter)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-[11px] text-muted-foreground">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[11px] text-muted-foreground">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No members found"
            description="Adjust your filters or wait for new memberships to be created via the public site."
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Member ID</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Plan</Th>
                  <Th>Expires</Th>
                  <Th>Stripe Customer</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <Td className="font-mono text-xs text-muted-foreground">{m.id.slice(-8)}</Td>
                    <Td className="font-semibold text-slate-900">{m.fullName}</Td>
                    <Td className="text-slate-700">{m.email}</Td>
                    <Td className="capitalize">{m.planId.replace('-', ' ')}</Td>
                    <Td>{m.expiresOn}</Td>
                    <Td className="font-mono text-xs">
                      {m.stripeCustomerId ?? (
                        <span className="text-muted-foreground italic">— sync needed</span>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        className={
                          m.status === 'active'
                            ? 'bg-emerald-600 text-white'
                            : m.status === 'pending'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-400 text-white'
                        }
                      >
                        {m.status}
                      </Badge>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canWrite}
                            aria-label="Member actions"
                          >
                            <DotsThree size={20} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {m.status !== 'active' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setStatus(m.id, 'active')
                                toast.success(`Marked ${m.fullName} as active.`)
                              }}
                            >
                              <CheckCircle className="mr-2" size={16} /> Mark active
                            </DropdownMenuItem>
                          )}
                          {m.status !== 'pending' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setStatus(m.id, 'pending')
                                toast.success(`Marked ${m.fullName} as pending.`)
                              }}
                            >
                              <Clock className="mr-2" size={16} /> Mark pending
                            </DropdownMenuItem>
                          )}
                          {m.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => {
                                cancel(m.id)
                                toast.success(`Cancelled ${m.fullName}.`)
                              }}
                            >
                              <XCircle className="mr-2" size={16} /> Cancel membership
                            </DropdownMenuItem>
                          )}
                          {m.status === 'expired' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setStatus(m.id, 'active')
                                toast.success(`Renewed ${m.fullName}.`)
                              }}
                            >
                              <ArrowCounterClockwise className="mr-2" size={16} /> Renew
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              remove(m.id)
                              toast.success(`Removed ${m.fullName}.`)
                            }}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash className="mr-2" size={16} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <div>
                Showing {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  )
}
