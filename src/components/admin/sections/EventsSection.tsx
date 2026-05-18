import { useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash,
  ArrowsClockwise,
  MagnifyingGlass,
  Ticket,
  DownloadSimple,
  X,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useEvents, sortByDate } from '@/hooks/useEvents'
import {
  CATEGORY_LABELS,
  type EventCategory,
  type TempleEvent,
  type TicketTier,
} from '@/data/events'
import { useAuth } from '@/lib/auth'
import { SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'

const EMPTY_FORM: Omit<TempleEvent, 'id'> = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  location: 'Ahane Hall, Limerick',
  category: 'prayer',
  isPaid: false,
  price: undefined,
  stripeProductId: '',
  ticketTiers: [],
}

export function EventsSection() {
  const { can } = useAuth()
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const canWrite = can('manageEvents')

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TempleEvent | null>(null)
  const [form, setForm] = useState<Omit<TempleEvent, 'id'>>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<TempleEvent | null>(null)
  const [attendeesFor, setAttendeesFor] = useState<TempleEvent | null>(null)

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
      stripeProductId: rest.stripeProductId ?? '',
      ticketTiers: rest.ticketTiers ?? [],
    })
    setOpen(true)
  }

  const save = (ev: React.FormEvent) => {
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
      price: form.isPaid ? Number(form.price) || 0 : undefined,
      stripeProductId: form.isPaid ? form.stripeProductId?.trim() || undefined : undefined,
      ticketTiers: form.isPaid ? form.ticketTiers : undefined,
    }
    if (editing) {
      updateEvent(editing.id, payload)
      toast.success('Event updated.')
    } else {
      addEvent(payload)
      toast.success('Event created.')
    }
    setOpen(false)
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
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 align-top">
                  <Td>
                    <div className="font-semibold text-slate-900">{e.date}</div>
                    {e.time && (
                      <div className="text-xs text-muted-foreground">{e.time}</div>
                    )}
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-900">{e.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                      {e.description}
                    </div>
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
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-2xl text-orange-800"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {editing ? 'Edit event' : 'New event'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the event details below.'
                : 'Add a new event to the public calendar.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Title" required>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Date" required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Time">
                <Input
                  value={form.time ?? ''}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  placeholder="e.g. 4:00 PM - 7:00 PM"
                />
              </Field>
            </div>
            <Field label="Location" required>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as EventCategory })}
              >
                <SelectTrigger>
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
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <Label className="text-sm font-semibold">Ticketed event</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle on for paid events, configure Stripe product and tiers.
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Default price (EUR)">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={form.price ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, price: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Stripe product ID">
                    <Input
                      value={form.stripeProductId ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, stripeProductId: e.target.value })
                      }
                      placeholder="prod_..."
                    />
                  </Field>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label className="text-sm font-semibold">Ticket tiers</Label>
                      <p className="text-xs text-muted-foreground">
                        Define multiple price points (e.g. Adult, Family, VIP).
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addTier}>
                      <Plus size={14} className="mr-1" /> Add tier
                    </Button>
                  </div>
                  {(form.ticketTiers ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No tiers configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {(form.ticketTiers ?? []).map((t) => (
                        <div
                          key={t.id}
                          className="grid grid-cols-12 gap-2 items-center"
                        >
                          <Input
                            className="col-span-5"
                            value={t.label}
                            onChange={(e) =>
                              updateTier(t.id, { label: e.target.value })
                            }
                            placeholder="Label"
                          />
                          <Input
                            className="col-span-3"
                            type="number"
                            value={t.price}
                            onChange={(e) =>
                              updateTier(t.id, { price: Number(e.target.value) })
                            }
                            placeholder="€"
                          />
                          <Input
                            className="col-span-3"
                            type="number"
                            value={t.quantity}
                            onChange={(e) =>
                              updateTier(t.id, { quantity: Number(e.target.value) })
                            }
                            placeholder="Qty"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="col-span-1 text-red-600"
                            onClick={() => removeTier(t.id)}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                {editing ? 'Save changes' : 'Create event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
