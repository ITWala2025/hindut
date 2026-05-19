import { useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Ticket,
  DownloadSimple,
  X,
  Image as ImageIcon,
  Check,
  CalendarBlank,
  Clock,
  MapPin,
  CurrencyEur,
  Tag,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import { useEvents, sortByDate } from '@/hooks/useEvents'
import { useMedia } from '@/hooks/useMedia'
import {
  CATEGORY_LABELS,
  type EventCategory,
  type TempleEvent,
  type TicketTier,
} from '@/data/events'
import { useAuth } from '@/lib/auth'
import { SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'
import type { MediaItem } from '@/lib/types'

const EMPTY_FORM: Omit<TempleEvent, 'id'> = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  location: 'Ahane Hall, Limerick',
  category: 'prayer',
  isPaid: false,
  price: undefined,
  image: undefined,
  stripeProductId: '',
  ticketTiers: [],
  published: true,
}

export function EventsSection() {
  const { can } = useAuth()
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const { media } = useMedia()
  const canWrite = can('manageEvents')

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TempleEvent | null>(null)
  const [form, setForm] = useState<Omit<TempleEvent, 'id'>>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<TempleEvent | null>(null)
  const [attendeesFor, setAttendeesFor] = useState<TempleEvent | null>(null)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imageSearch, setImageSearch] = useState('')

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
    })
    setOpen(true)
  }

  const imagePickerImages = useMemo(() => {
    const q = imageSearch.toLowerCase()
    return media.filter(
      (m) =>
        /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(m.filename) &&
        (!q || m.title.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q)),
    )
  }, [media, imageSearch])

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.title.trim() || !form.date || !form.location.trim()) {
      toast.error('Title, date and location are required.')
      return
    }
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      // Use undefined (not || undefined) so the key is always present in the object,
      // letting updateEvent know to explicitly clear image_url when there's no image.
      image: form.image ? form.image : undefined,
      price: form.isPaid ? Number(form.price) || 0 : undefined,
      stripeProductId: form.isPaid ? form.stripeProductId?.trim() || undefined : undefined,
      ticketTiers: form.isPaid ? form.ticketTiers : undefined,
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

  const exportAttendeeCsv = (_e: TempleEvent) => {
    toast.info('Attendee export is available once tickets are synced from the database.')
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Event management"
        description="Create, edit and remove events from the public calendar. Paid events sync to Stripe via a product ID."
        actions={
          <>
            {canWrite && (
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
                        onClick={() => setAttendeesFor(e)}
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
                      disabled={!canWrite}
                      className="text-orange-700 hover:bg-orange-50"
                    >
                      <Pencil size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(e)}
                      disabled={!canWrite}
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
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Diwali Celebration 2026"
                    required
                  />
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
                <Field label="Time">
                  <div className="relative">
                    <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={form.time ?? ''}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      placeholder="4:00 PM – 7:00 PM"
                      className="pl-9"
                    />
                  </div>
                </Field>
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

      {/* Attendees drawer */}
      <Sheet open={!!attendeesFor} onOpenChange={(o) => (!o ? setAttendeesFor(null) : null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{attendeesFor?.title}</SheetTitle>
            <SheetDescription>Ticket sales and attendee list (mock data).</SheetDescription>
          </SheetHeader>
          {attendeesFor && (
            <div className="mt-4 space-y-4">
              <Button
                variant="outline"
                onClick={() => exportAttendeeCsv(attendeesFor)}
                className="w-full"
              >
                <DownloadSimple className="mr-2" />
                Export attendees CSV
              </Button>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Tier</Th>
                    <Th>Qty</Th>
                    <Th>Paid</Th>
                  </tr>
                </thead>
                <tbody>
                  {attendeesFor && (
                    <p className="text-sm text-muted-foreground italic text-center py-4">Ticket data available in the database — connect attendees query to view here.</p>
                  )}
                </tbody>
              </DataTable>
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

      {/* Media Library image picker */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
              Select image from Media Library
            </DialogTitle>
            <DialogDescription>
              Click an image to use it as the event cover.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search images…"
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {imagePickerImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <ImageIcon size={40} weight="duotone" />
                <p className="text-sm">No images found. Upload images in the Media Library first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imagePickerImages.map((item: MediaItem) => {
                  const isSelected = form.image === item.url
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, image: item.url }))
                        setImagePickerOpen(false)
                      }}
                      className={cn(
                        'relative rounded-lg overflow-hidden border-2 aspect-square focus:outline-none transition-all hover:border-orange-400',
                        isSelected ? 'border-orange-500 ring-2 ring-orange-300' : 'border-transparent',
                      )}
                    >
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                          <div className="bg-orange-500 text-white rounded-full p-1">
                            <Check size={16} weight="bold" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-1 truncate">
                        {item.title}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setImagePickerOpen(false)}>
              Cancel
            </Button>
            {form.image && (
              <Button
                variant="ghost"
                onClick={() => { setForm((f) => ({ ...f, image: undefined })); setImagePickerOpen(false) }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X size={16} className="mr-1" /> Remove image
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
