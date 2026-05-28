import { useState, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Heart,
  Image as ImageIcon,
  X,
  Check,
  Target,
  ArrowsClockwise,
  ArrowSquareOut,
  Pause,
  Play,
  XCircle,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from 'sonner'
import {
  useSpecialCauses,
  slugifyCause,
  type CauseWithStats,
  type NewSpecialCause,
} from '@/hooks/useSpecialCauses'
import { useAuth } from '@/lib/auth'
import { useMedia } from '@/hooks/useMedia'
import { KpiCard, SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import type { MediaItem } from '@/lib/types'

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
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ status }: { status: CauseWithStats['status'] }) {
  const map: Record<CauseWithStats['status'], { cls: string; label: string }> = {
    draft:  { cls: 'bg-slate-100 text-slate-700',     label: 'Draft'  },
    active: { cls: 'bg-emerald-100 text-emerald-800', label: 'Active' },
    paused: { cls: 'bg-amber-100 text-amber-800',     label: 'Paused' },
    closed: { cls: 'bg-red-100 text-red-700',         label: 'Closed' },
  }
  const { cls, label } = map[status]
  return <Badge className={cls}>{label}</Badge>
}

function ProgressBar({ raised, target }: { raised: number; target: number | null }) {
  if (!target) return <span className="text-xs text-muted-foreground">No target</span>
  const pct = Math.min(100, Math.round((raised / target) * 100))
  return (
    <div className="w-full space-y-1">
      <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {pct}% of €{target.toLocaleString('en-IE')}
      </div>
    </div>
  )
}

const EMPTY_FORM: NewSpecialCause = {
  slug:              '',
  title:             '',
  description:       '',
  cover_image_url:   '',
  target_amount_eur: null,
  deadline:          null,
  status:            'draft',
}

export function SpecialCausesSection() {
  const { can } = useAuth()
  const canCreate = can('causes:create')
  const canUpdate = can('causes:update')
  const canDelete = can('causes:delete')

  const { causes, loading, error, refetch, createCause, updateCause, deleteCause } =
    useSpecialCauses()
  const { media } = useMedia()

  const [search, setSearch]             = useState('')
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editTarget, setEditTarget]     = useState<CauseWithStats | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CauseWithStats | null>(null)
  const [form, setForm]                 = useState<NewSpecialCause>(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imageSearch, setImageSearch]   = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return causes
    const q = search.toLowerCase()
    return causes.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q),
    )
  }, [causes, search])

  const activeCauses = causes.filter((c) => c.status === 'active').length
  const totalRaised  = causes.reduce((s, c) => s + (c.total_raised ?? 0), 0)
  const totalDonors  = causes.reduce((s, c) => s + Number(c.donor_count ?? 0), 0)

  const imagePickerImages = useMemo(() => {
    const q = imageSearch.toLowerCase()
    return (media as MediaItem[]).filter(
      (m) =>
        /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(m.filename) &&
        (!q || m.title.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q)),
    )
  }, [media, imageSearch])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setSlugManuallyEdited(false)
    setSheetOpen(true)
  }

  function openEdit(c: CauseWithStats) {
    setEditTarget(c)
    setForm({
      slug:              c.slug,
      title:             c.title,
      description:       c.description       ?? '',
      cover_image_url:   c.cover_image_url   ?? '',
      target_amount_eur: c.target_amount_eur ?? null,
      deadline:          c.deadline ? c.deadline.slice(0, 10) : null,
      status:            c.status,
    })
    setSlugManuallyEdited(true)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setSlugManuallyEdited(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.slug.trim())  { toast.error('Slug is required.');  return }
    setSaving(true)
    try {
      const payload: NewSpecialCause = {
        ...form,
        description:       form.description       || undefined,
        cover_image_url:   form.cover_image_url   || undefined,
        target_amount_eur: form.target_amount_eur ?? null,
        deadline:          form.deadline ? new Date(form.deadline).toISOString() : null,
      }
      if (editTarget) {
        await updateCause(editTarget.id, payload)
        toast.success('Campaign updated.')
      } else {
        await createCause(payload)
        toast.success('Campaign created.')
      }
      closeSheet()
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save campaign.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteCause(deleteTarget.id)
      toast.success('Campaign deleted.')
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete campaign.')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleQuickStatus(c: CauseWithStats, status: CauseWithStats['status']) {
    try {
      await updateCause(c.id, { status })
      const label = status === 'active' ? 'published' : status === 'paused' ? 'paused' : 'closed'
      toast.success(`Campaign ${label}.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update status.')
    }
  }

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Active Campaigns"
          value={String(activeCauses)}
          icon={<Heart size={22} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Total Raised"
          value={`€${totalRaised.toLocaleString('en-IE', { minimumFractionDigits: 2 })}`}
          icon={<Target size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Total Donors"
          value={String(totalDonors)}
          icon={<Heart size={22} weight="duotone" />}
          accent="amber"
        />
      </div>

      {/* Main section */}
      <SectionCard
        title="Special Cause Campaigns"
        description="Create, manage, and publish dedicated donation campaigns with real-time progress tracking."
        actions={
          <>
            {canCreate && (
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <Plus size={15} className="mr-1.5" />
                New Campaign
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <ArrowsClockwise size={15} className="mr-1.5" />
              Refresh
            </Button>
          </>
        }
      >
        {/* Search */}
        <div className="relative mb-5 max-w-sm">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading campaigns…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Heart size={32} className="text-orange-300" weight="fill" />}
            title="No campaigns yet"
            description="Create your first special cause campaign to start collecting targeted donations."
            action={
              canCreate ? (
                <Button
                  onClick={openCreate}
                  className="bg-linear-to-r from-orange-600 to-amber-600 text-white"
                >
                  <Plus size={15} className="mr-1.5" /> New Campaign
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Status</Th>
                <Th>Progress</Th>
                <Th>Raised</Th>
                <Th>Donors</Th>
                <Th>Deadline</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-middle">
                  <Td>
                    <div className="flex items-center gap-3">
                      {c.cover_image_url ? (
                        <img
                          src={c.cover_image_url}
                          alt=""
                          className="h-10 w-16 rounded object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-16 rounded bg-orange-100 flex items-center justify-center shrink-0">
                          <Heart size={16} className="text-orange-400" weight="fill" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 line-clamp-1">{c.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          /causes/{c.slug}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td>
                    <div className="min-w-[120px]">
                      <ProgressBar raised={c.total_raised ?? 0} target={c.target_amount_eur} />
                    </div>
                  </Td>
                  <Td>
                    <span className="font-bold text-slate-900">
                      €{(c.total_raised ?? 0).toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm">{String(c.donor_count ?? 0)}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.deadline ? formatDate(c.deadline) : '—'}
                    </span>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {/* Public page link */}
                    {c.status !== 'draft' && (
                      <Link to={`/causes/${c.slug}`} target="_blank">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          title="View public page"
                        >
                          <ArrowSquareOut size={15} />
                        </Button>
                      </Link>
                    )}
                    {/* Publish draft */}
                    {canUpdate && c.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickStatus(c, 'active')}
                        className="text-emerald-600 hover:bg-emerald-50"
                        title="Publish"
                      >
                        <Play size={15} />
                      </Button>
                    )}
                    {/* Pause / close active */}
                    {canUpdate && c.status === 'active' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickStatus(c, 'paused')}
                          className="text-amber-600 hover:bg-amber-50"
                          title="Pause"
                        >
                          <Pause size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickStatus(c, 'closed')}
                          className="text-red-500 hover:bg-red-50"
                          title="Close campaign"
                        >
                          <XCircle size={15} />
                        </Button>
                      </>
                    )}
                    {/* Resume / close paused */}
                    {canUpdate && c.status === 'paused' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickStatus(c, 'active')}
                          className="text-emerald-600 hover:bg-emerald-50"
                          title="Resume"
                        >
                          <Play size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickStatus(c, 'closed')}
                          className="text-red-500 hover:bg-red-50"
                          title="Close"
                        >
                          <XCircle size={15} />
                        </Button>
                      </>
                    )}
                    {/* Edit */}
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="text-orange-700 hover:bg-orange-50"
                        title="Edit"
                      >
                        <Pencil size={15} />
                        <span className="ml-1 hidden sm:inline">Edit</span>
                      </Button>
                    )}
                    {/* Delete */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(c)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash size={15} />
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {/* ─── Create / Edit Sheet (right slide-over) ─────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { if (!o) closeSheet() }}>
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
                  {editTarget ? 'Edit campaign' : 'New campaign'}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
                  {editTarget
                    ? 'Update the campaign details and save.'
                    : 'Fill in the details to create a new donation campaign with its own public page.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable form */}
          <form
            id="cause-form"
            onSubmit={handleSave}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
          >
            {/* Cover image */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Cover image
              </p>
              {form.cover_image_url ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-48 group">
                  <img
                    src={form.cover_image_url}
                    alt="Campaign cover"
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
                      onClick={() => setForm((f) => ({ ...f, cover_image_url: '' }))}
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

            {/* Campaign details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Campaign details
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
                        slug: slugManuallyEdited ? f.slug : slugifyCause(title),
                      }))
                    }}
                    placeholder="e.g. Diwali Lamp Fund 2026"
                    required
                  />
                </Field>

                <Field label="URL slug" required>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">/causes/</span>
                    <Input
                      value={form.slug ?? ''}
                      onChange={(e) => {
                        setSlugManuallyEdited(true)
                        setForm((f) => ({
                          ...f,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        }))
                      }}
                      placeholder="diwali-lamp-fund-2026"
                      className="font-mono text-sm"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Public URL:{' '}
                    <span className="font-mono">/causes/{form.slug || '…'}</span>
                  </p>
                </Field>

                <Field label="Description">
                  <Textarea
                    value={form.description ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    placeholder="Describe what this campaign is for and how donations will be used…"
                  />
                </Field>
              </div>
            </div>

            <Separator />

            {/* Goal & timeline */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Goal &amp; timeline
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Target amount (€)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      €
                    </span>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Optional"
                      className="pl-6"
                      value={form.target_amount_eur ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          target_amount_eur: e.target.value ? parseFloat(e.target.value) : null,
                        }))
                      }
                    />
                  </div>
                </Field>
                <Field label="Deadline">
                  <Input
                    type="date"
                    value={form.deadline ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, deadline: e.target.value || null }))
                    }
                  />
                </Field>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Visibility
              </p>
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as NewSpecialCause['status'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft — hidden from public</SelectItem>
                    <SelectItem value="active">Active — visible &amp; donations open</SelectItem>
                    <SelectItem value="paused">Paused — visible, donations closed</SelectItem>
                    <SelectItem value="closed">Closed — campaign ended</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Set to <strong>Active</strong> to publish the campaign and open donations.
                </p>
              </Field>
            </div>
          </form>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={closeSheet}
              className="text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="cause-form"
              disabled={saving}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold px-8"
            >
              {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create campaign'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Media Library image picker (separate Dialog) ────────────────── */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle
              className="text-orange-800"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Select image from Media Library
            </DialogTitle>
            <DialogDescription>
              Click an image to use it as the campaign cover.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mb-3">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
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
                  const isSelected = form.cover_image_url === item.url
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, cover_image_url: item.url }))
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
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ───────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently deleted. Donation records
              linked to this campaign will have their cause reference cleared but will not be deleted.
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
