import { useMemo, useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Ticket,
  DownloadSimple,
  X,
  Image as ImageIcon,
  CalendarBlank,
  Clock,
  MapPin,
  CurrencyEur,
  Tag,
  Spinner,
  Users,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { useEvents, sortByDate, toSlug } from '@/hooks/useEvents'
import { useServices } from '@/hooks/useServices'
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog'
import {
  CATEGORY_LABELS,
  type EventCategory,
  type EventService,
  type TempleEvent,
  type TicketTier,
} from '@/data/events'
import { useAuth } from '@/lib/auth'
import { SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'
import { useTicketBookings, type TicketBookingRow } from '@/hooks/useTicketBookings'

function parseTimeStr(val: string): { h: string; m: string; period: string } | null {
  const match = val.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  return { h: match[1], m: match[2], period: match[3].toUpperCase() }
}

interface TimePickerProps {
  value: string
  onChange: (v: string) => void
  label: string
}

function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const init = value ? parseTimeStr(value) : null
  const [localH, setLocalH]           = useState(init?.h      ?? '')
  const [localM, setLocalM]           = useState(init?.m      ?? '')
  const [localPeriod, setLocalPeriod] = useState(init?.period ?? 'PM')

  // Keep local state in sync when the parent resets the value (e.g. form clear)
  useEffect(() => {
    const p = value ? parseTimeStr(value) : null
    setLocalH(p?.h      ?? '')
    setLocalM(p?.m      ?? '')
    setLocalPeriod(p?.period ?? 'PM')
  }, [value])

  const handleHour = (hr: string) => {
    setLocalH(hr)
    if (localM) { onChange(`${hr}:${localM} ${localPeriod}`); setOpen(false) }
  }

  const handleMinute = (min: string) => {
    setLocalM(min)
    if (localH) { onChange(`${localH}:${min} ${localPeriod}`); setOpen(false) }
  }

  const handlePeriod = (p: string) => {
    setLocalPeriod(p)
    if (localH && localM) onChange(`${localH}:${localM} ${p}`)
  }

  const handleClear = () => {
    setLocalH(''); setLocalM(''); setLocalPeriod('PM')
    onChange('')
    setOpen(false)
  }

  const display = value || ''

  return (
    <div>
      <Label className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn('w-full justify-start font-normal', !display && 'text-muted-foreground')}
          >
            <Clock size={15} className="mr-2 shrink-0" />
            {display || 'Set time'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3" align="start">
          {/* AM / PM toggle */}
          <div className="flex gap-1 mb-3">
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriod(p)}
                className={cn(
                  'flex-1 py-1 text-sm rounded font-medium transition-colors',
                  localPeriod === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/70',
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Hour grid 1–12 */}
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Hour</p>
          <div className="grid grid-cols-4 gap-1 mb-3">
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((hr) => (
              <button
                key={hr}
                type="button"
                onClick={() => handleHour(hr)}
                className={cn(
                  'py-1.5 text-sm rounded transition-colors',
                  localH === hr
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted',
                )}
              >
                {hr}
              </button>
            ))}
          </div>

          {/* Minute buttons */}
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Minute</p>
          <div className="grid grid-cols-4 gap-1">
            {['00', '15', '30', '45'].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => handleMinute(min)}
                className={cn(
                  'py-1.5 text-sm rounded transition-colors',
                  localM === min
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-muted',
                )}
              >
                {min}
              </button>
            ))}
          </div>

          {(localH || localM) && (
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

const EMPTY_FORM: Omit<TempleEvent, 'id'> = {
  slug: '',
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  location: 'Ahane Hall, Limerick',
  category: 'prayer',
  isPaid: false,
  price: undefined,
  image: undefined,
  stripeProductId: '',
  ticketTiers: [],
  eventServices: [],
  published: true,
}

export function EventsSection() {
  const { can } = useAuth()
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const { services: allServices } = useServices()
  const canCreate = can('events:create')
  const canUpdate = can('events:update')
  const canDelete = can('events:delete')
  const canWrite = canCreate || canUpdate || canDelete

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TempleEvent | null>(null)
  const [form, setForm] = useState<Omit<TempleEvent, 'id'>>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<TempleEvent | null>(null)
  const [attendeesFor, setAttendeesFor] = useState<TempleEvent | null>(null)
  const [attendeeEventId, setAttendeeEventId] = useState<string | null>(null)
  const { bookings: attendees, loading: attendeesLoading } = useTicketBookings(
    attendeeEventId ? { eventId: attendeeEventId } : undefined,
  )
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imageSearch, setImageSearch] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const filtered = useMemo(() => {
    const list = sortByDate(events)
    return list.filter((e) => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      )
    })
  }, [events, search, filterCategory])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSlugManuallyEdited(false)
    setOpen(true)
  }

  const openEdit = (e: TempleEvent) => {
    setEditing(e)
    const { id: _id, ...rest } = e
    void _id
    setForm({
      ...EMPTY_FORM,
      ...rest,
      image: rest.image ?? undefined,
      stripeProductId: rest.stripeProductId ?? '',
      ticketTiers: rest.ticketTiers ?? [],
      eventServices: rest.eventServices ?? [],
    })
    setSlugManuallyEdited(true)
    setOpen(true)
  }

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.title.trim() || !form.date || !form.location.trim()) {
      toast.error('Title, date and location are required.')
      return
    }
    const slug = (form.slug || toSlug(form.title)).trim()
    if (!slug) {
      toast.error('A URL slug is required.')
      return
    }
    const payload = {
      ...form,
      slug,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      // Use undefined (not || undefined) so the key is always present in the object,
      // letting updateEvent know to explicitly clear image_url when there's no image.
      image: form.image ? form.image : undefined,
      price: form.isPaid ? Number(form.price) || 0 : undefined,
      stripeProductId: form.isPaid ? form.stripeProductId?.trim() || undefined : undefined,
      ticketTiers: form.isPaid ? form.ticketTiers : undefined,
      eventServices: form.isPaid ? [] : (form.eventServices ?? []),
    }
    try {
      if (editing) {
        await updateEvent(editing.id, payload)
        toast.success('Event updated.')
      } else {
        await addEvent(payload)
        toast.success('Event created.')
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save event.')
    }
  }

  const remove = () => {
    if (!confirmDelete) return
    deleteEvent(confirmDelete.id)
    toast.success(`Deleted "${confirmDelete.title}".`)
    setConfirmDelete(null)
  }

  const addTier = () => {
    setForm((f) => ({
      ...f,
      ticketTiers: [
        ...(f.ticketTiers ?? []),
        {
          id: `tier-${Date.now()}`,
          label: 'Adult',
          price: 10,
          quantity: 50,
        },
      ],
    }))
  }

  const updateTier = (id: string, patch: Partial<TicketTier>) => {
    setForm((f) => ({
      ...f,
      ticketTiers: (f.ticketTiers ?? []).map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }))
  }

  const removeTier = (id: string) => {
    setForm((f) => ({
      ...f,
      ticketTiers: (f.ticketTiers ?? []).filter((t) => t.id !== id),
    }))
  }

  const addEventService = (svc: { id: string; title: string }) => {
    if ((form.eventServices ?? []).some((es) => es.serviceId === svc.id)) return
    setForm((f) => ({
      ...f,
      eventServices: [
        ...(f.eventServices ?? []),
        { id: `esvc-${Date.now()}`, serviceId: svc.id, name: svc.title, amountEur: 10 },
      ],
    }))
  }

  const updateEventService = (id: string, patch: Partial<EventService>) => {
    setForm((f) => ({
      ...f,
      eventServices: (f.eventServices ?? []).map((es) =>
        es.id === id ? { ...es, ...patch } : es,
      ),
    }))
  }

  const removeEventService = (id: string) => {
    setForm((f) => ({
      ...f,
      eventServices: (f.eventServices ?? []).filter((es) => es.id !== id),
    }))
  }

  const exportAttendeeCsv = (e: TempleEvent) => {
    const rows = attendees.filter((b) => b.event_id === e.id)
    if (rows.length === 0) {
      toast.info('No bookings found for this event.')
      return
    }
    
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
    
    const header = ['Reference', 'First name', 'Last name', 'Email', 'Phone', 'Adults', 'Children', 'Amount (EUR)', 'Status', 'Booked at']
    // Force phone (index 4) to be treated as text
    const textForceFields = new Set([4])
    
    const lines = rows.map((b: TicketBookingRow) => {
      const values = [
        b.reference_number,
        b.first_name,
        b.last_name,
        b.email_masked,
        b.phone_masked,
        b.num_adults,
        b.num_children,
        b.amount_eur.toFixed(2),
        b.status,
        new Date(b.created_at).toLocaleDateString('en-IE'),
      ]
      return values.map((v, idx) => escapeCSV(v, textForceFields.has(idx))).join(',')
    })
    
    const csv = [header.map((h) => escapeCSV(h)).join(','), ...lines].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `attendees-${e.title.replace(/\s+/g, '-').toLowerCase()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Event management"
        description="Create, edit and remove events from the public calendar. Paid events sync to Stripe via a product ID."
        actions={
          <>
            {canCreate && (
              <Button
                onClick={openCreate}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <Plus className="mr-2" weight="bold" />
                New event
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by title, location, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterCategory}
            onValueChange={(v) => setFilterCategory(v as EventCategory | 'all')}
          >
            <SelectTrigger className="md:w-56">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No events match your filters"
            description="Try clearing the search or selecting a different category."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Category</Th>
                <Th>Ticketing</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isPast = !e.published
                return (
                <tr key={e.id} className={cn('border-t border-slate-100 align-top', isPast && 'opacity-60 bg-slate-50')}>
                  <Td>
                    <div className="font-semibold text-slate-900">{e.date}</div>
                    {e.time && (
                      <div className="text-xs text-muted-foreground">{e.time}</div>
                    )}
                    {isPast && (
                      <Badge className="mt-1 bg-slate-400 text-white text-[10px] px-1.5 py-0">
                        Past
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-900">{e.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                      {e.description}
                    </div>
                    {e.image && (
                      <div className="mt-1.5">
                        <img
                          src={e.image}
                          alt={e.title}
                          className="h-10 w-16 rounded object-cover border border-slate-200"
                        />
                      </div>
                    )}
                    {e.stripeProductId && (
                      <div className="text-[10px] mt-1 font-mono text-indigo-700">
                        Stripe: {e.stripeProductId}
                      </div>
                    )}
                  </Td>
                  <Td>{e.location}</Td>
                  <Td>
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      {CATEGORY_LABELS[e.category]}
                    </Badge>
                  </Td>
                  <Td>
                    {e.isPaid ? (
                      <div className="space-y-1">
                        <Badge className="bg-amber-500 text-white">€{e.price ?? 0}</Badge>
                        {e.ticketTiers && e.ticketTiers.length > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            {e.ticketTiers.length} tier
                            {e.ticketTiers.length === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge className="bg-emerald-600 text-white">Free</Badge>
                    )}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {e.isPaid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAttendeesFor(e); setAttendeeEventId(e.id) }}
                        className="text-indigo-700 hover:bg-indigo-50"
                      >
                        <Ticket size={16} className="mr-1" />
                        Tickets
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(e)}
                      disabled={!canUpdate}
                      className="text-orange-700 hover:bg-orange-50"
                    >
                      <Pencil size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(e)}
                      disabled={!canDelete}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash size={16} className="mr-1" />
                      Delete
                    </Button>
                  </Td>
                </tr>
                )
              })}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {/* Create / edit slide-over */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden"
        >
          {/* Sticky header */}
          <SheetHeader className="px-6 py-5 border-b border-slate-200 shrink-0 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle
                  className="text-xl font-bold text-orange-900"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {editing ? 'Edit event' : 'New event'}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
                  {editing
                    ? 'Update the event details and save to sync with the public calendar.'
                    : 'Fill in the details to add a new event to the public calendar.'}
                </SheetDescription>
                {editing && !editing.published && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    This event has expired (past date) and is hidden from the public. Change the date to a future date to reactivate it.
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable form body */}
          <form
            id="event-form"
            onSubmit={save}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
          >
            {/* Cover image */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Cover image
              </p>
              {form.image ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-48 group">
                  <img
                    src={form.image}
                    alt="Event cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => { setImageSearch(''); setImagePickerOpen(true) }}
                      className="bg-white/90 text-slate-800 hover:bg-white"
                    >
                      <ImageIcon size={14} className="mr-1.5" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setForm({ ...form, image: undefined })}
                      className="bg-white/90 text-red-600 hover:bg-white hover:text-red-700"
                    >
                      <X size={14} className="mr-1.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setImageSearch(''); setImagePickerOpen(true) }}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/50 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-orange-600"
                >
                  <ImageIcon size={32} weight="duotone" />
                  <span className="text-sm font-medium">Select from Media Library</span>
                  <span className="text-xs text-slate-400">Click to browse uploaded images</span>
                </button>
              )}
            </div>

            <Separator />

            {/* Basic details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Event details
              </p>
              <div className="space-y-4">
                <Field label="Title" required>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value
                      setForm((f) => ({
                        ...f,
                        title,
                        slug: slugManuallyEdited ? f.slug : toSlug(title),
                      }))
                    }}
                    placeholder="e.g. Diwali Celebration 2026"
                    required
                  />
                </Field>
                <Field label="URL slug" required>
                  <Input
                    value={form.slug ?? ''}
                    onChange={(e) => {
                      setSlugManuallyEdited(true)
                      setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
                    }}
                    placeholder="e.g. diwali-celebration-2026"
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Public URL: <span className="font-mono">/events/{form.slug || '…'}</span>
                  </p>
                </Field>
                <Field label="Description">
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder="Describe what attendees can expect…"
                  />
                </Field>
              </div>
            </div>

            <Separator />

            {/* Date, time, location */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Date, time & location
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date" required>
                  <div className="relative">
                    <CalendarBlank size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="pl-9"
                      required
                    />
                  </div>
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <TimePicker
                  label="Start Time"
                  value={form.startTime ?? ''}
                  onChange={(v) => setForm({ ...form, startTime: v, endTime: v ? (form.endTime ?? '') : '' })}
                />
                <TimePicker
                  label="End Time"
                  value={form.endTime ?? ''}
                  onChange={(v) => setForm({ ...form, endTime: v })}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Location" required>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="pl-9"
                      required
                    />
                  </div>
                </Field>
                <Field label="Category">
                  <div className="relative">
                    <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v as EventCategory })}
                    >
                      <SelectTrigger className="pl-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                          <SelectItem key={id} value={id}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
              </div>
            </div>

            <Separator />

            {/* Ticketing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ticketing
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable for paid events and configure Stripe.
                  </p>
                </div>
                <Switch
                  checked={form.isPaid}
                  onCheckedChange={(checked) =>
                    setForm({
                      ...form,
                      isPaid: checked,
                      price: checked ? form.price ?? 10 : undefined,
                    })
                  }
                />
              </div>

              {form.isPaid && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Default price (EUR)">
                      <div className="relative">
                        <CurrencyEur size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={form.price ?? ''}
                          onChange={(e) =>
                            setForm({ ...form, price: Number(e.target.value) })
                          }
                          className="pl-9"
                        />
                      </div>
                    </Field>
                    <Field label="Stripe product ID">
                      <Input
                        value={form.stripeProductId ?? ''}
                        onChange={(e) =>
                          setForm({ ...form, stripeProductId: e.target.value })
                        }
                        placeholder="prod_..."
                        className="font-mono text-sm"
                      />
                    </Field>
                  </div>

                  {/* Ticket tiers */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">Ticket tiers</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addTier}>
                        <Plus size={13} className="mr-1" /> Add tier
                      </Button>
                    </div>
                    {(form.ticketTiers ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No tiers — one flat price will apply.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 px-1">
                          <span className="col-span-5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Label</span>
                          <span className="col-span-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Price €</span>
                          <span className="col-span-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Qty</span>
                          <span className="col-span-1" />
                        </div>
                        {(form.ticketTiers ?? []).map((t) => (
                          <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
                            <Input
                              className="col-span-5"
                              value={t.label}
                              onChange={(e) => updateTier(t.id, { label: e.target.value })}
                              placeholder="e.g. Adult"
                            />
                            <Input
                              className="col-span-3"
                              type="number"
                              min={0}
                              value={t.price}
                              onChange={(e) => updateTier(t.id, { price: Number(e.target.value) })}
                            />
                            <Input
                              className="col-span-3"
                              type="number"
                              min={1}
                              value={t.quantity}
                              onChange={(e) => updateTier(t.id, { quantity: Number(e.target.value) })}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="col-span-1 h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => removeTier(t.id)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Event Services — free events only */}
            {!form.isPaid && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Optional services
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Attendees can add these during RSVP and pay online.
                      </p>
                    </div>
                  </div>

                  {/* Service picker */}
                  {allServices.filter((s) => s.published).length > 0 && (
                    <div className="mb-3">
                      <Label className="text-sm font-semibold mb-1.5 block">Add a service</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value=""
                        onChange={(e) => {
                          const svc = allServices.find((s) => s.id === e.target.value)
                          if (svc) addEventService(svc)
                        }}
                      >
                        <option value="">— Select a service to add —</option>
                        {allServices
                          .filter((s) => s.published && !(form.eventServices ?? []).some((es) => es.serviceId === s.id))
                          .map((s) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                      </select>
                    </div>
                  )}

                  {(form.eventServices ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No services added — this event will be RSVP-only.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 px-1">
                        <span className="col-span-7 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Service</span>
                        <span className="col-span-4 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Fee €</span>
                        <span className="col-span-1" />
                      </div>
                      {(form.eventServices ?? []).map((es) => (
                        <div key={es.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7 text-sm font-medium text-slate-700 truncate px-1">
                            {es.name}
                          </div>
                          <Input
                            className="col-span-4"
                            type="number"
                            min={0}
                            step={0.01}
                            value={es.amountEur}
                            onChange={(e) => updateEventService(es.id, { amountEur: Number(e.target.value) })}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="col-span-1 h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => removeEventService(es.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </form>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="event-form"
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold px-8"
            >
              {editing ? 'Save changes' : 'Create event'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!attendeesFor} onOpenChange={(o) => { if (!o) { setAttendeesFor(null); setAttendeeEventId(null) } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users size={18} weight="duotone" className="text-indigo-600" />
              {attendeesFor?.title}
            </SheetTitle>
            <SheetDescription>Ticket bookings for this event.</SheetDescription>
          </SheetHeader>
          {attendeesFor && (
            <div className="mt-4 space-y-4">
              {/* Summary bar */}
              {!attendeesLoading && attendees.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-500">Bookings: <span className="font-semibold text-slate-800">{attendees.length}</span></span>
                  <span className="text-slate-500">Adults: <span className="font-semibold text-slate-800">{attendees.reduce((s, b) => s + b.num_adults, 0)}</span></span>
                  <span className="text-slate-500">Children: <span className="font-semibold text-slate-800">{attendees.reduce((s, b) => s + b.num_children, 0)}</span></span>
                  <span className="text-slate-500">Revenue: <span className="font-semibold text-emerald-700">€{attendees.reduce((s, b) => s + b.amount_eur, 0).toFixed(2)}</span></span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => exportAttendeeCsv(attendeesFor)}
                className="w-full"
                disabled={attendeesLoading || attendees.length === 0}
              >
                <DownloadSimple className="mr-2" />
                Export attendees CSV
              </Button>

              {attendeesLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Spinner size={20} className="animate-spin" />
                  Loading bookings…
                </div>
              ) : attendees.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No ticket bookings found for this event.
                </div>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      <Th>Ref</Th>
                      <Th>Adults</Th>
                      <Th>Children</Th>
                      <Th>Paid</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100 text-sm">
                        <Td>{b.first_name} {b.last_name}</Td>
                        <Td className="font-mono text-xs">{b.reference_number}</Td>
                        <Td>{b.num_adults}</Td>
                        <Td>{b.num_children}</Td>
                        <Td>€{b.amount_eur.toFixed(2)}</Td>
                        <Td>
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                            b.status === 'confirmed'  && 'bg-emerald-100 text-emerald-700',
                            b.status === 'pending'    && 'bg-amber-100 text-amber-700',
                            b.status === 'cancelled'  && 'bg-rose-100 text-rose-700',
                            b.status === 'refunded'   && 'bg-slate-100 text-slate-600',
                          )}>
                            {b.status}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{confirmDelete?.title}" from your local event list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MediaPickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        selectedUrl={form.image}
        onSelect={(url) => setForm((f) => ({ ...f, image: url }))}
        onRemove={() => setForm((f) => ({ ...f, image: undefined }))}
        description="Click an image to use it as the event cover."
        search={imageSearch}
        onSearchChange={setImageSearch}
      />
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
