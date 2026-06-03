import { useMemo, useState } from 'react'
import {
  MagnifyingGlass,
  DownloadSimple,
  CalendarBlank,
  ClipboardText,
  XCircle,
  Eye,
  ArrowsClockwise,
  Users,
  CheckCircle,
  Prohibit,
  CurrencyEur,
  ChartBar,
} from '@phosphor-icons/react'
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
  SheetDescription,
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRsvps, type RsvpRow } from '@/hooks/useRsvps'
import { useEvents, sortByDate } from '@/hooks/useEvents'
import { useAuth } from '@/lib/auth'
import { useRsvpServicePayments, useEventServiceSummary } from '@/hooks/useRsvpServicePayments'
import { KpiCard, SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'

type StatusFilter = 'all' | 'confirmed' | 'cancelled'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RsvpsSection() {
  const { can } = useAuth()
  const canCreate = can('rsvps:create')
  const canUpdate = can('rsvps:update')
  const canDelete = can('rsvps:delete')
  const canWrite = canCreate || canUpdate || canDelete

  // Filters
  const [search,         setSearch]     = useState('')
  const [eventFilter,    setEventFilter]  = useState<string>('all')
  const [statusFilter,   setStatusFilter] = useState<StatusFilter>('all')
  const [fromDate,       setFromDate]    = useState('')
  const [toDate,         setToDate]      = useState('')

  // UI state
  const [detail,         setDetail]      = useState<RsvpRow | null>(null)
  const [cancelTarget,   setCancelTarget] = useState<RsvpRow | null>(null)
  const [exporting,      setExporting]   = useState(false)
  const [page,           setPage]        = useState(1)
  const pageSize = 15

  // Service payment detail (loaded when detail sheet opens)
  const { payments: detailPayments, loading: detailPaymentsLoading } = useRsvpServicePayments(detail?.id ?? null)

  // Per-event service revenue summary (loaded when an event filter is selected)
  const summaryEventId = eventFilter !== 'all' ? eventFilter : null
  const {
    summary: serviceSummary,
    totalRevenue: serviceRevenue,
    pendingRevenue: servicePendingRevenue,
    loading: summaryLoading,
  } = useEventServiceSummary(summaryEventId)

  const { rsvps, loading, error, refetch, cancelRsvp, exportCsv } = useRsvps({
    eventId:  eventFilter  !== 'all' ? eventFilter  : undefined,
    fromDate: fromDate     || undefined,
    toDate:   toDate       || undefined,
    status:   statusFilter !== 'all' ? statusFilter : undefined,
  })

  const { events } = useEvents()
  const freeEvents = useMemo(
    () => sortByDate(events).filter((e) => !e.isPaid),
    [events],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return rsvps
    const q = search.toLowerCase()
    return rsvps.filter(
      (r) =>
        r.first_name.toLowerCase().includes(q) ||
        r.last_name.toLowerCase().includes(q) ||
        r.reference_number.toLowerCase().includes(q) ||
        r.email_masked.toLowerCase().includes(q) ||
        r.event_title.toLowerCase().includes(q),
    )
  }, [rsvps, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // KPIs
  const confirmed  = rsvps.filter((r) => r.status === 'confirmed').length
  const cancelled  = rsvps.filter((r) => r.status === 'cancelled').length
  const totalPax   = rsvps
    .filter((r) => r.status === 'confirmed')
    .reduce((acc, r) => acc + r.num_adults + r.num_children, 0)

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelRsvp(cancelTarget.id)
      toast.success(`RSVP ${cancelTarget.reference_number} cancelled.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to cancel RSVP.')
    } finally {
      setCancelTarget(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportCsv({
        eventId:  eventFilter  !== 'all' ? eventFilter  : undefined,
        fromDate: fromDate     || undefined,
        toDate:   toDate       || undefined,
        status:   statusFilter !== 'all' ? statusFilter : undefined,
      })
      toast.success('CSV downloaded successfully.')
    } catch (err) {
      toast.error((err as Error).message ?? 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total RSVPs"
          value={String(rsvps.length)}
          icon={<ClipboardText size={22} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Confirmed"
          value={String(confirmed)}
          icon={<CheckCircle size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Cancelled"
          value={String(cancelled)}
          icon={<Prohibit size={22} weight="duotone" />}
          accent="red"
        />
        <KpiCard
          label="Expected Attendees"
          value={String(totalPax)}
          icon={<Users size={22} weight="duotone" />}
          accent="blue"
        />
      </div>

      {/* Service revenue summary (shown when an event is selected) */}
      {summaryEventId && (
        <SectionCard
          title="Service Revenue"
          description={`Paid service bookings for this event. Pending = RSVP'd but payment not yet completed.`}
          actions={
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                Collected: <span className="font-semibold text-emerald-700">€{serviceRevenue.toFixed(2)}</span>
              </span>
              {servicePendingRevenue > 0 && (
                <span className="text-muted-foreground">
                  Pending: <span className="font-semibold text-amber-600">€{servicePendingRevenue.toFixed(2)}</span>
                </span>
              )}
            </div>
          }
        >
          {summaryLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading service data…</div>
          ) : serviceSummary.length === 0 ? (
            <EmptyState
              icon={<ChartBar size={28} className="text-orange-300" />}
              title="No service payments"
              description="No services have been selected for RSVPs on this event yet."
            />
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>Selections</Th>
                  <Th>Collected</Th>
                  <Th>Pending</Th>
                  <Th>Total billed</Th>
                </tr>
              </thead>
              <tbody>
                {serviceSummary.map((s) => (
                  <tr key={s.service_name} className="border-t border-slate-100 text-sm">
                    <Td><span className="font-semibold text-slate-800">{s.service_name}</span></Td>
                    <Td>{s.count}</Td>
                    <Td><span className="text-emerald-700 font-semibold">€{s.paid_eur.toFixed(2)}</span></Td>
                    <Td>
                      {(s.total_eur - s.paid_eur) > 0 ? (
                        <span className="text-amber-600">€{(s.total_eur - s.paid_eur).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>€{s.total_eur.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </SectionCard>
      )}

      {/* Main table section */}
      <SectionCard
        title="RSVP Management"
        description="View, filter, and manage RSVPs for free events. Phone and email are masked; download CSV for full details."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <ArrowsClockwise size={15} className="mr-1.5" />
              Refresh
            </Button>
            {canWrite && (
              <Button
                size="sm"
                onClick={handleExport}
                disabled={exporting || rsvps.length === 0}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                {exporting ? (
                  <ArrowsClockwise size={15} className="mr-1.5 animate-spin" />
                ) : (
                  <DownloadSimple size={15} className="mr-1.5" />
                )}
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
          <Select
            value={eventFilter}
            onValueChange={(v) => { setEventFilter(v); setPage(1) }}
          >
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="All free events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All free events</SelectItem>
              {freeEvents.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1) }}
          >
            <SelectTrigger className="md:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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
          <div className="py-12 text-center text-muted-foreground">Loading RSVPs…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardText size={32} className="text-orange-300" />}
            title="No RSVPs found"
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
                  <Th>Attendees</Th>
                  <Th>Contact (masked)</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <Td>
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {r.reference_number}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-slate-900">
                        {r.first_name} {r.last_name}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-slate-700 max-w-[160px] line-clamp-1 block">
                        {r.event_title}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-sm">
                        {r.num_adults}A
                        {r.num_children > 0 ? ` / ${r.num_children}C` : ''}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{r.email_masked}</div>
                        <div>{r.phone_masked}</div>
                      </div>
                    </Td>
                    <Td>
                      {r.status === 'confirmed' ? (
                        <Badge className="bg-emerald-600 text-white">Confirmed</Badge>
                      ) : (
                        <Badge className="bg-slate-400 text-white">Cancelled</Badge>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetail(r)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Eye size={15} />
                      </Button>
                      {canWrite && r.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelTarget(r)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle size={15} />
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
                  Showing {(safePage - 1) * pageSize + 1}–
                  {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
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
      <Sheet open={!!detail} onOpenChange={(v) => { if (!v) setDetail(null) }}>
        <SheetContent className="w-full sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <ClipboardText size={20} weight="duotone" className="text-orange-600" />
              RSVP Detail
            </SheetTitle>
            <SheetDescription>
              Full record for reservation {detail?.reference_number}
            </SheetDescription>
          </SheetHeader>

          {detail && (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
                <DetailRow label="Reference"    value={detail.reference_number} mono />
                <DetailRow label="Status"       value={
                  <Badge className={detail.status === 'confirmed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-400 text-white'}>
                    {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                  </Badge>
                } />
                <hr className="border-slate-100" />
                <DetailRow label="Event"        value={detail.event_title} />
                <hr className="border-slate-100" />
                <DetailRow label="First Name"   value={detail.first_name} />
                <DetailRow label="Last Name"    value={detail.last_name} />
                <DetailRow label="Email"        value={`${detail.email_masked} (encrypted)`} />
                <DetailRow label="Phone"        value={`${detail.phone_masked} (encrypted)`} />
                <hr className="border-slate-100" />
                <DetailRow label="Adults"       value={String(detail.num_adults)} />
                <DetailRow label="Children"     value={String(detail.num_children)} />
                <hr className="border-slate-100" />
                <DetailRow label="GDPR Consent" value={detail.consent_gdpr ? 'Yes' : 'No'} />
                <DetailRow label="Email Sent"   value={
                  detail.confirmation_sent_at
                    ? formatDate(detail.confirmation_sent_at)
                    : 'Not sent'
                } />
                <DetailRow label="Submitted"    value={formatDate(detail.created_at)} />

                <p className="text-xs text-muted-foreground mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  Full phone and email are encrypted at rest. Export CSV (admin only) to
                  access decrypted contact details.
                </p>

                {/* Service payments for this RSVP */}
                {detailPaymentsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading service payments…</p>
                ) : detailPayments.length > 0 && (
                  <div className="mt-2">
                    <hr className="border-slate-100 mb-3" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <CurrencyEur size={13} className="text-orange-500" />
                      Services booked
                    </p>
                    <div className="space-y-1.5">
                      {detailPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{p.service_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">€{p.amount_eur.toFixed(2)}</span>
                            <span className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium',
                              p.status === 'paid'    && 'bg-emerald-100 text-emerald-700',
                              p.status === 'pending' && 'bg-amber-100 text-amber-700',
                              p.status === 'failed'  && 'bg-rose-100 text-rose-700',
                            )}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-slate-100">
                      <span className="text-slate-600">Total</span>
                      <span className="text-slate-900">
                        €{detailPayments.reduce((s, p) => s + p.amount_eur, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
                  Close
                </Button>
                {canWrite && detail.status === 'confirmed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => { setDetail(null); setCancelTarget(detail) }}
                  >
                    <XCircle size={15} className="mr-2" />
                    Cancel RSVP
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel RSVP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{' '}
              <strong>
                {cancelTarget?.first_name} {cancelTarget?.last_name}
              </strong>
              's RSVP ({cancelTarget?.reference_number}) as cancelled. This action can be
              reversed by contacting a developer if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep RSVP</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Cancel RSVP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0 w-32">{label}</span>
      <span className={`text-slate-900 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}
