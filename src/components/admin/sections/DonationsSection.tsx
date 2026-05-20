import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  CurrencyEur,
  DownloadSimple,
  Eye,
  HandCoins,
  MagnifyingGlass,
  PlusCircle,
  Prohibit,
  Timer,
  Trash,
} from '@phosphor-icons/react'
import { useAuth } from '@/lib/auth'
import { useDonations, type DonationRow, type NewDonation } from '@/hooks/useDonations'
import { useReceiptFlags } from '@/hooks/useReceipts'
import { downloadReceiptPdf } from '@/lib/receiptPdf'
import { KpiCard, SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type StatusFilter = 'all' | 'pending' | 'succeeded' | 'failed' | 'refunded'
type GatewayFilter = 'all' | 'stripe' | 'manual'

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: DonationRow['status'] }) {
  const map: Record<DonationRow['status'], { cls: string; label: string }> = {
    pending:   { cls: 'bg-amber-500 text-white',   label: 'Pending'   },
    succeeded: { cls: 'bg-emerald-600 text-white',  label: 'Succeeded' },
    failed:    { cls: 'bg-red-500 text-white',      label: 'Failed'    },
    refunded:  { cls: 'bg-slate-400 text-white',    label: 'Refunded'  },
  }
  const { cls, label } = map[status] ?? { cls: 'bg-slate-400 text-white', label: status }
  return <Badge className={cls}>{label}</Badge>
}

const EMPTY_FORM: NewDonation = {
  donor_name:  '',
  donor_email: '',
  amount_eur:  0,
  gateway:     'manual',
  status:      'succeeded',
  recurring:   false,
  description: '',
}

export function DonationsSection() {
  const { can, user } = useAuth()
  const isAdmin  = user?.role === 'admin'
  const canWrite = can('manageReceipts')

  // Filters
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [gatewayFilter, setGatewayFilter] = useState<GatewayFilter>('all')
  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             = useState('')
  const [page, setPage]                 = useState(1)

  // Dialogs
  const [detail, setDetail]             = useState<DonationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DonationRow | null>(null)
  const [statusTarget, setStatusTarget] = useState<DonationRow | null>(null)
  const [newStatus, setNewStatus]       = useState<DonationRow['status']>('succeeded')
  const [addOpen, setAddOpen]           = useState(false)
  const [form, setForm]                 = useState<NewDonation>(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)

  const { donations, loading, error, refetch, updateStatus, addDonation, deleteDonation } =
    useDonations({
      fromDate: fromDate || undefined,
      toDate:   toDate   || undefined,
      status:   statusFilter  !== 'all' ? statusFilter  : undefined,
      gateway:  gatewayFilter !== 'all' ? gatewayFilter : undefined,
    })

  const { flags: receiptFlags, refetch: refetchFlags, fetchReceiptById } = useReceiptFlags('donation')

  const handleDownloadReceipt = async (donationId: string) => {
    const flag = receiptFlags.get(donationId)
    if (!flag) { toast.error('No receipt generated yet for this donation.'); return }
    const r = await fetchReceiptById(flag.id)
    if (!r) { toast.error('Could not load receipt.'); return }
    downloadReceiptPdf(r)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return donations
    const q = search.toLowerCase()
    return donations.filter(
      (d) =>
        (d.donor_name  ?? '').toLowerCase().includes(q) ||
        (d.donor_email ?? '').toLowerCase().includes(q) ||
        (d.stripe_payment_intent_id ?? '').toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q),
    )
  }, [donations, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // KPIs
  const succeeded  = donations.filter((d) => d.status === 'succeeded').length
  const pending    = donations.filter((d) => d.status === 'pending').length
  const totalRaised = donations
    .filter((d) => d.status === 'succeeded')
    .reduce((sum, d) => sum + (d.amount_eur ?? 0), 0)

  // Handlers
  const handleUpdateStatus = async () => {
    if (!statusTarget) return
    try {
      await updateStatus(statusTarget.id, newStatus)
      toast.success(`Donation status updated to "${newStatus}".`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update status.')
    } finally {
      setStatusTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDonation(deleteTarget.id)
      toast.success('Donation record deleted.')
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete donation.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleAdd = async () => {
    if (!form.amount_eur || form.amount_eur <= 0) {
      toast.error('Amount must be greater than 0.')
      return
    }
    setSaving(true)
    try {
      await addDonation(form)
      toast.success('Donation recorded successfully.')
      setAddOpen(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to record donation.')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const headers = [
      'Donor Name', 'Donor Email', 'Amount (€)', 'Currency', 'Gateway',
      'Payment Intent ID', 'Status', 'Recurring', 'Description', 'Date',
    ]
    const rows = filtered.map((d) => [
      d.donor_name  ?? '',
      d.donor_email ?? '',
      d.amount_eur.toFixed(2),
      d.currency,
      d.gateway,
      d.stripe_payment_intent_id ?? '',
      d.status,
      d.recurring ? 'Yes' : 'No',
      d.description ?? '',
      new Date(d.created_at).toISOString(),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a   = document.createElement('a')
    a.href     = url
    a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded.')
  }

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Donations"
          value={String(donations.length)}
          icon={<HandCoins size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Succeeded"
          value={String(succeeded)}
          icon={<CheckCircle size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Pending"
          value={String(pending)}
          icon={<Timer size={22} weight="duotone" />}
          accent="amber"
        />
        <KpiCard
          label="Total Raised"
          value={`€${totalRaised.toLocaleString('en-IE', { minimumFractionDigits: 2 })}`}
          icon={<CurrencyEur size={22} weight="duotone" />}
          accent="orange"
        />
      </div>

      {/* Main section */}
      <SectionCard
        title="Donation Management"
        description="View, filter, and manage all donations. Add manual cash donations or update payment status."
        actions={
          <>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setForm(EMPTY_FORM); setAddOpen(true) }}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <PlusCircle size={15} className="mr-1.5" />
                Add Donation
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetch(); refetchFlags() }}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowsClockwise size={15} className="mr-1.5" />
              Refresh
            </Button>
            {canWrite && (
              <Button
                size="sm"
                onClick={handleExport}
                disabled={donations.length === 0}
                className="bg-linear-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 font-semibold"
              >
                <DownloadSimple size={15} className="mr-1.5" />
                Export CSV
              </Button>
            )}
          </>
        }
      >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-5 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search donor name, email, description…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1) }}>
            <SelectTrigger className="md:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          {/* Gateway filter */}
          <Select value={gatewayFilter} onValueChange={(v) => { setGatewayFilter(v as GatewayFilter); setPage(1) }}>
            <SelectTrigger className="md:w-36">
              <SelectValue placeholder="Gateway" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All gateways</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <CalendarBlank size={15} className="text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
              className="w-36"
              aria-label="From date"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1) }}
              className="w-36"
              aria-label="To date"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
            {error}
          </p>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading donations…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<HandCoins size={32} className="text-emerald-300" />}
            title="No donations found"
            description="Try adjusting your filters or add a manual donation."
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Donor</Th>
                  <Th>Amount</Th>
                  <Th>Gateway</Th>
                  <Th>Recurring</Th>
                  <Th>Status</Th>
                  <Th>Receipt</Th>
                  <Th>Description</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 align-top">
                    <Td>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {d.donor_name || <span className="text-muted-foreground italic">Anonymous</span>}
                        </div>
                        {d.donor_email && (
                          <div className="text-xs text-muted-foreground">{d.donor_email}</div>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className="font-bold text-slate-900">
                        €{d.amount_eur.toFixed(2)}
                      </span>
                    </Td>
                    <Td>
                      <span className="capitalize text-sm">{d.gateway}</span>
                    </Td>
                    <Td>
                      {d.recurring ? (
                        <Badge className="bg-sky-100 text-sky-700 border border-sky-200">Monthly</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">One-off</span>
                      )}
                    </Td>
                    <Td><StatusBadge status={d.status} /></Td>
                    <Td>
                      {receiptFlags.has(d.id) ? (
                        <Badge className="bg-emerald-600 text-white font-mono text-[10px]" title={receiptFlags.get(d.id)?.receiptNumber}>
                          ✓ {receiptFlags.get(d.id)?.receiptNumber}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-muted-foreground max-w-[140px] line-clamp-2 block">
                        {d.description || '—'}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(d.created_at)}
                      </span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetail(d)}
                        className="text-slate-600 hover:text-slate-900"
                        title="View details"
                      >
                        <Eye size={15} />
                      </Button>
                      {receiptFlags.has(d.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(d.id)}
                          className="text-indigo-600 hover:bg-indigo-50"
                          title="Download receipt PDF"
                        >
                          <DownloadSimple size={15} />
                        </Button>
                      )}
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStatusTarget(d); setNewStatus(d.status) }}
                          className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          title="Update status"
                        >
                          <Prohibit size={15} />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(d)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete donation"
                        >
                          <Trash size={15} />
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <SheetContent className="w-full sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <HandCoins size={18} weight="duotone" className="text-emerald-600" />
              Donation Details
            </SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={detail.status} />
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Donor Name</span>
                <span className="font-semibold">{detail.donor_name || 'Anonymous'}</span>
              </div>
              {detail.donor_email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Donor Email</span>
                  <span className="text-xs text-muted-foreground">{detail.donor_email}</span>
                </div>
              )}
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-slate-900">
                  €{detail.amount_eur.toFixed(2)} {detail.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gateway</span>
                <span className="capitalize">{detail.gateway}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recurring</span>
                <span>{detail.recurring ? 'Yes (Monthly)' : 'No (One-off)'}</span>
              </div>
              {detail.stripe_payment_intent_id && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Stripe Payment ID</span>
                  <span className="font-mono text-xs text-slate-700 break-all text-right">
                    {detail.stripe_payment_intent_id}
                  </span>
                </div>
              )}
              {detail.description && (
                <>
                  <hr className="border-slate-100" />
                  <div>
                    <p className="text-muted-foreground mb-1">Description</p>
                    <p className="text-slate-700">{detail.description}</p>
                  </div>
                </>
              )}
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs text-muted-foreground">{formatDate(detail.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-xs text-muted-foreground">{formatDate(detail.updated_at)}</span>
              </div>

            </div>
          )}
          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-wrap gap-2 items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setDetail(null)}>Close</Button>
            {canWrite && detail && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => { setDetail(null); setStatusTarget(detail); setNewStatus(detail.status) }}
                >
                  Update Status
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setDetail(null); setDeleteTarget(detail) }}
                  >
                    <Trash size={14} className="mr-1.5" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Update Status Dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => { if (!o) setStatusTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Donation Status</DialogTitle>
            <DialogDescription>
              Change the status for the donation from{' '}
              <strong>{statusTarget?.donor_name || 'Anonymous'}</strong> (€
              {statusTarget?.amount_eur.toFixed(2)}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">New Status</Label>
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as DonationRow['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleUpdateStatus}
            >
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Donation Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setForm(EMPTY_FORM) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Donation</DialogTitle>
            <DialogDescription>
              Record a cash or offline donation. This will be saved with gateway "manual".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-donor-name" className="mb-1.5 block">Donor Name</Label>
                <Input
                  id="add-donor-name"
                  placeholder="Optional"
                  value={form.donor_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, donor_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="add-donor-email" className="mb-1.5 block">Donor Email</Label>
                <Input
                  id="add-donor-email"
                  type="email"
                  placeholder="Optional"
                  value={form.donor_email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, donor_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-amount" className="mb-1.5 block">Amount (€) *</Label>
                <Input
                  id="add-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount_eur || ''}
                  onChange={(e) => setForm((f) => ({ ...f, amount_eur: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="add-status" className="mb-1.5 block">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as DonationRow['status'] }))}
                >
                  <SelectTrigger id="add-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="add-description" className="mb-1.5 block">Description</Label>
              <Input
                id="add-description"
                placeholder="e.g. Cash donation at Diwali event"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="add-recurring"
                checked={form.recurring}
                onCheckedChange={(c) => setForm((f) => ({ ...f, recurring: !!c }))}
              />
              <Label htmlFor="add-recurring" className="cursor-pointer">Monthly recurring donation</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setForm(EMPTY_FORM) }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Record Donation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete donation record?</AlertDialogTitle>
            <AlertDialogDescription>
              The donation of <strong>€{deleteTarget?.amount_eur.toFixed(2)}</strong> from{' '}
              <strong>{deleteTarget?.donor_name || 'Anonymous'}</strong> will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
