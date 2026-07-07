import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  DownloadSimple,
  Eye,
  MagnifyingGlass,
  Money,
  Prohibit,
  Ticket,
  Trash,
  XCircle,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { useAuth } from '@/lib/auth'
import { useTicketBookings, type TicketBookingRow } from '@/hooks/useTicketBookings'
import { useEvents, sortByDate } from '@/hooks/useEvents'
import { useReceiptFlags } from '@/hooks/useReceipts'
import { downloadReceiptPdf } from '@/lib/receiptPdf'
import { KpiCard, SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'refunded'

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: TicketBookingRow['status'] }) {
  const map: Record<TicketBookingRow['status'], { cls: string; label: string }> = {
    pending:   { cls: 'bg-amber-500 text-white',   label: 'Pending'   },
    confirmed: { cls: 'bg-emerald-600 text-white',  label: 'Confirmed' },
    cancelled: { cls: 'bg-slate-400 text-white',    label: 'Cancelled' },
    refunded:  { cls: 'bg-violet-500 text-white',   label: 'Refunded'  },
  }
  const { cls, label } = map[status] ?? { cls: 'bg-slate-400 text-white', label: status }
  return <Badge className={cls}>{label}</Badge>
}

export function TicketBookingsSection() {
  const { can, user } = useAuth()
  const isAdmin  = user?.role === 'admin'
  const canCreate = can('tickets:create')
  const canUpdate = can('tickets:update')
  const canDelete = can('tickets:delete')
  const canWrite = canCreate || canUpdate || canDelete

  // Filters
  const [search, setSearch]               = useState('')
  const [eventFilter, setEventFilter]     = useState('all')
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [fromDate, setFromDate]           = useState('')
  const [toDate, setToDate]               = useState('')
  const [page, setPage]                   = useState(1)

  // Dialogs
  const [detail, setDetail]               = useState<TicketBookingRow | null>(null)
  const [cancelTarget, setCancelTarget]   = useState<TicketBookingRow | null>(null)
  const [refundTarget, setRefundTarget]   = useState<TicketBookingRow | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<TicketBookingRow | null>(null)

  // Only pass a filter object when at least one filter is active; otherwise pass
  // undefined so the hook loads all bookings (passing an empty object triggers
  // the hook's "no eventId → return empty" guard).
  const activeFilters = useMemo(() => {
    const f: import('@/hooks/useTicketBookings').TicketBookingFilters = {}
    if (eventFilter !== 'all') f.eventId  = eventFilter
    if (fromDate)              f.fromDate = fromDate
    if (toDate)                f.toDate   = toDate
    if (statusFilter !== 'all') f.status  = statusFilter
    return Object.keys(f).length > 0 ? f : undefined
  }, [eventFilter, fromDate, toDate, statusFilter])

  const { bookings, loading, error, refetch, updateStatus, deleteBooking } = useTicketBookings(activeFilters)

  const { flags: receiptFlags, refetch: refetchFlags, fetchReceiptById } = useReceiptFlags('event')

  const handleDownloadReceipt = async (bookingId: string) => {
    const flag = receiptFlags.get(bookingId)
    if (!flag) { toast.error('No receipt generated yet for this booking.'); return }
    const r = await fetchReceiptById(flag.id)
    if (!r) { toast.error('Could not load receipt.'); return }
    await downloadReceiptPdf(r)
  }

  const { events } = useEvents()
  const paidEvents = useMemo(
    () => sortByDate(events).filter((e) => e.isPaid),
    [events],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings
    const q = search.toLowerCase()
    return bookings.filter(
      (b) =>
        b.first_name.toLowerCase().includes(q)       ||
        b.last_name.toLowerCase().includes(q)        ||
        b.reference_number.toLowerCase().includes(q) ||
        b.email_masked.toLowerCase().includes(q)     ||
        b.event_title.toLowerCase().includes(q),
    )
  }, [bookings, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // KPIs
  const confirmed  = bookings.filter((b) => b.status === 'confirmed').length
  const cancelRefund = bookings.filter((b) => b.status === 'cancelled' || b.status === 'refunded').length
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'pending')
    .reduce((sum, b) => sum + (b.amount_eur ?? 0), 0)

  // Handlers
  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await updateStatus(cancelTarget.id, 'cancelled')
      toast.success(`Booking ${cancelTarget.reference_number} cancelled.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to cancel booking.')
    } finally {
      setCancelTarget(null)
    }
  }

  const handleRefund = async () => {
    if (!refundTarget) return
    try {
      await updateStatus(refundTarget.id, 'refunded')
      toast.success(`Booking ${refundTarget.reference_number} marked as refunded.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to mark as refunded.')
    } finally {
      setRefundTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBooking(deleteTarget.id)
      toast.success(`Booking ${deleteTarget.reference_number} deleted.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete booking.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleExport = () => {
    const headers = [
      'Reference', 'First Name', 'Last Name', 'Email (masked)', 'Phone (masked)',
      'Event', 'Adults', 'Children', 'Amount (€)', 'Gateway', 'Payment Ref',
      'Status', 'Submitted',
    ]
    
    const escapeCSV = (value: unknown, forceText: boolean = false): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      
      // Force numeric-looking values to be treated as text by prefixing with a single quote
      const isNumericLooking = /^\d+$/.test(str)
      const needsQuotePrefix = forceText || isNumericLooking
      
      let result = str
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        result = `"${str.replace(/"/g, '""')}"`
      }
      
      // If numeric-looking and not already quoted, add quote prefix
      if (needsQuotePrefix && !result.startsWith('"')) {
        result = `'${result}`
      }
      
      return result
    }
    
    const rows = filtered.map((b) => [
      b.reference_number,
      b.first_name,
      b.last_name,
      b.email_masked,
      b.phone_masked,
      b.event_title,
      String(b.num_adults),
      String(b.num_children),
      b.amount_eur.toFixed(2),
      b.payment_gateway ?? '',
      b.payment_reference ?? '',
      b.status,
      new Date(b.created_at).toISOString(),
    ])
    
    // Force phone (index 4) to be treated as text
    const textForceFields = new Set([4])
    
    const csvLines = [headers, ...rows].map((row, rowIdx) => {
      if (rowIdx === 0) {
        // Headers - no special escaping needed
        return row.map((c) => escapeCSV(c)).join(',')
      } else {
        // Data rows - apply forceText to phone column
        return row.map((c, colIdx) => escapeCSV(c, textForceFields.has(colIdx))).join(',')
      }
    })
    
    const csv = csvLines.join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a   = document.createElement('a')
    a.href     = url
    a.download = `ticket-bookings-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded.')
  }

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Bookings"
          value={String(bookings.length)}
          icon={<Ticket size={22} weight="duotone" />}
          accent="blue"
        />
        <KpiCard
          label="Confirmed"
          value={String(confirmed)}
          icon={<CheckCircle size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Cancelled / Refunded"
          value={String(cancelRefund)}
          icon={<Prohibit size={22} weight="duotone" />}
          accent="red"
        />
        <KpiCard
          label="Total Revenue"
          value={`€${totalRevenue.toLocaleString('en-IE', { minimumFractionDigits: 2 })}`}
          icon={<Money size={22} weight="duotone" />}
          accent="orange"
        />
      </div>

      {/* Main table section */}
      <SectionCard
        title="Ticket Bookings"
        description="View and manage paid event ticket bookings. Phone and email are masked for privacy; download CSV for full details."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetch(); refetchFlags() }}
              className="border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <ArrowsClockwise size={15} className="mr-1.5" />
              Refresh
            </Button>
            {canWrite && (
              <Button
                size="sm"
                onClick={handleExport}
                disabled={bookings.length === 0}
                className="bg-linear-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 font-semibold"
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
              placeholder="Search name, ref, email, event…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>

          {/* Event filter */}
          <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setPage(1) }}>
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="All paid events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All paid events</SelectItem>
              {paidEvents.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1) }}>
            <SelectTrigger className="md:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
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
          <div className="py-12 text-center text-muted-foreground">Loading bookings…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Ticket size={32} className="text-violet-300" />}
            title="No bookings found"
            description="Try adjusting your filters or check back after the next event."
          />
        ) : (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Ref #</Th>
                  <Th>Name</Th>
                  <Th>Event</Th>
                  <Th>Tickets</Th>
                  <Th>Amount</Th>
                  <Th>Contact (masked)</Th>
                  <Th>Status</Th>
                  <Th>Receipt</Th>
                  <Th>Submitted</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100 align-top">
                    <Td>
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {b.reference_number}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-slate-900">
                        {b.first_name} {b.last_name}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-slate-700 max-w-[160px] line-clamp-1 block">
                        {b.event_title}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm">
                        {b.num_adults}A{b.num_children > 0 ? ` / ${b.num_children}C` : ''}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-slate-900">
                        €{b.amount_eur.toFixed(2)}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{b.email_masked}</div>
                        <div>{b.phone_masked}</div>
                      </div>
                    </Td>
                    <Td><StatusBadge status={b.status} /></Td>
                    <Td>
                      {receiptFlags.has(b.id) ? (
                        <Badge className="bg-emerald-600 text-white font-mono text-[10px]" title={receiptFlags.get(b.id)?.receiptNumber}>
                          ✓ {receiptFlags.get(b.id)?.receiptNumber}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(b.created_at)}
                      </span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetail(b)}
                        className="text-slate-600 hover:text-slate-900"
                        title="View details"
                      >
                        <Eye size={15} />
                      </Button>
                      {receiptFlags.has(b.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(b.id)}
                          className="text-indigo-600 hover:bg-indigo-50"
                          title="Download receipt PDF"
                        >
                          <DownloadSimple size={15} />
                        </Button>
                      )}
                      {canWrite && b.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelTarget(b)}
                          className="text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                          title="Cancel booking"
                        >
                          <XCircle size={15} />
                        </Button>
                      )}
                      {canWrite && (b.status === 'confirmed' || b.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRefundTarget(b)}
                          className="text-violet-500 hover:text-violet-700 hover:bg-violet-50"
                          title="Mark as refunded"
                        >
                          <ArrowCounterClockwise size={15} />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(b)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete booking"
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
              <Ticket size={18} weight="duotone" className="text-violet-600" />
              Booking Details
            </SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono font-semibold text-slate-900">{detail.reference_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={detail.status} />
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold">{detail.first_name} {detail.last_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email (masked)</span>
                <span className="text-xs text-muted-foreground">{detail.email_masked}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone (masked)</span>
                <span className="text-xs text-muted-foreground">{detail.phone_masked}</span>
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium text-right max-w-[200px]">{detail.event_title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tickets</span>
                <span>
                  {detail.num_adults} Adult{detail.num_adults !== 1 ? 's' : ''}
                  {detail.num_children > 0 ? ` + ${detail.num_children} Child${detail.num_children !== 1 ? 'ren' : ''}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-slate-900">€{detail.amount_eur.toFixed(2)}</span>
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Gateway</span>
                <span className="capitalize">{detail.payment_gateway ?? '—'}</span>
              </div>
              {detail.payment_reference && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment Ref</span>
                  <span className="font-mono text-xs text-slate-700 break-all text-right max-w-[200px]">
                    {detail.payment_reference}
                  </span>
                </div>
              )}
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span className="text-xs text-muted-foreground">{formatDate(detail.created_at)}</span>
              </div>
              {detail.confirmation_sent_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confirmation sent</span>
                  <span className="text-xs text-muted-foreground">{formatDate(detail.confirmation_sent_at)}</span>
                </div>
              )}

            </div>
          )}
          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-wrap gap-2 items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setDetail(null)}>Close</Button>
            {canWrite && detail && (
              <div className="flex flex-wrap gap-2">
                {detail.status === 'confirmed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => { setDetail(null); setCancelTarget(detail) }}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Cancel
                  </Button>
                )}
                {(detail.status === 'confirmed' || detail.status === 'pending') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-violet-600 border-violet-200 hover:bg-violet-50"
                    onClick={() => { setDetail(null); setRefundTarget(detail) }}
                  >
                    <ArrowCounterClockwise size={14} className="mr-1.5" />
                    Refund
                  </Button>
                )}
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

      {/* Cancel Confirm Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <strong>{cancelTarget?.reference_number}</strong> for{' '}
              <strong>{cancelTarget?.first_name} {cancelTarget?.last_name}</strong> will be
              marked as cancelled. This does not automatically issue a refund.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleCancel}
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Confirm Dialog */}
      <AlertDialog open={!!refundTarget} onOpenChange={(o) => { if (!o) setRefundTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as refunded?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <strong>{refundTarget?.reference_number}</strong> will be marked as{' '}
              <strong>Refunded</strong>. Ensure the actual Stripe refund has been issued
              separately before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleRefund}
            >
              Mark Refunded
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking record?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <strong>{deleteTarget?.reference_number}</strong> will be permanently
              deleted. This action cannot be undone and removes all associated data.
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
