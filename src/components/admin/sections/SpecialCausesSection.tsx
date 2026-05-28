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
  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<CauseWithStats | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CauseWithStats | null>(null)
  const [form, setForm]                 = useState<NewSpecialCause>(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
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
    return media.filter(
      (m) =>
        /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(m.filename) &&
        (!q || m.title.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q)),
    )
  }, [media, imageSearch])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
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
    setFormOpen(true)
  }

  async function handleSave() {
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
      setFormOpen(false)
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
                    {/* Public link (non-draft only) */}
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
                    {/* Pause active */}
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
                          title="Close campaign"
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
                        className="text-slate-600 hover:text-slate-900"
                        title="Edit"
                      >
                        <Pencil size={15} />
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

      {/* ─── Create / Edit Dialog ───────────────────────────────────────── */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) { setFormOpen(false); setEditTarget(null); setForm(EMPTY_FORM) }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Campaign' : 'New Special Cause Campaign'}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? 'Update the campaign details.'
                : 'Create a dedicated donation campaign with its own public page.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label htmlFor="sc-title" className="mb-1.5 block">Title *</Label>
              <Input
                id="sc-title"
                placeholder="e.g. Diwali Lamp Fund 2026"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: editTarget ? f.slug : slugifyCause(title),
                  }))
                }}
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="sc-slug" className="mb-1.5 block">
                URL Slug *{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  (auto-generated, editable)
                </span>
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0">/causes/</span>
                <Input
                  id="sc-slug"
                  placeholder="diwali-lamp-fund-2026"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    }))
                  }
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="sc-desc" className="mb-1.5 block">Description</Label>
              <Textarea
                id="sc-desc"
                placeholder="Describe what this campaign is for and how donations will be used…"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Cover image */}
            <div>
              <Label className="mb-1.5 block">Cover Image</Label>
              {form.cover_image_url ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={form.cover_image_url}
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, cover_image_url: '' }))}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setImagePickerOpen(true)}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/40 flex flex-col items-center justify-center gap-1.5 text-orange-600 hover:text-orange-800 transition-colors"
                >
                  <ImageIcon size={22} />
                  <span className="text-xs">Click to select from media library</span>
                </button>
              )}
            </div>

            {/* Target + Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sc-target" className="mb-1.5 block">Target Amount (€)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    €
                  </span>
                  <Input
                    id="sc-target"
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
              </div>
              <div>
                <Label htmlFor="sc-deadline" className="mb-1.5 block">Deadline</Label>
                <Input
                  id="sc-deadline"
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deadline: e.target.value || null }))
                  }
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="sc-status" className="mb-1.5 block">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as NewSpecialCause['status'] }))
                }
              >
                <SelectTrigger id="sc-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft — hidden from public</SelectItem>
                  <SelectItem value="active">Active — visible &amp; donations open</SelectItem>
                  <SelectItem value="paused">Paused — visible, donations closed</SelectItem>
                  <SelectItem value="closed">Closed — campaign ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setFormOpen(false); setEditTarget(null); setForm(EMPTY_FORM) }}
            >
              Cancel
            </Button>
            <Button
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Image Picker Dialog ─────────────────────────────────────────── */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Cover Image</DialogTitle>
            <DialogDescription>Choose an image from your media library.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search images…"
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto">
            {imagePickerImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, cover_image_url: img.url }))
                  setImagePickerOpen(false)
                  setImageSearch('')
                }}
                className={cn(
                  'relative rounded-lg overflow-hidden aspect-video border-2 border-transparent hover:border-orange-500 transition-colors',
                  form.cover_image_url === img.url && 'border-orange-500',
                )}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover"
                />
                {form.cover_image_url === img.url && (
                  <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                    <Check size={22} className="text-white" weight="bold" />
                  </div>
                )}
              </button>
            ))}
            {imagePickerImages.length === 0 && (
              <p className="col-span-3 text-center text-sm text-muted-foreground py-6">
                No images found.
              </p>
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
