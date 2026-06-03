import { useState } from 'react'
import {
  PlusCircle,
  PencilSimple,
  Trash,
  ArrowUp,
  ArrowDown,
  Users,
  ToggleLeft,
  ToggleRight,
  IdentificationBadge,
  Image as ImageIcon,
  X,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { useTeamCrud, type TeamMemberRow, type TeamMemberInput } from '@/hooks/useTeamCrud'
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog'
import { useAuth } from '@/lib/auth'
import { KpiCard, SectionCard, EmptyState } from '@/components/admin/adminUi'

const EMPTY_FORM: TeamMemberInput = {
  name: '',
  origin: '',
  role: '',
  bio: '',
  sort_order: 0,
  active: true,
  image_url: null,
}

function MemberList({ table }: { table: 'team_members' | 'operational_committee_members' }) {
  const { can } = useAuth()
  const canCreate = can('team:create')
  const canUpdate = can('team:update')
  const canDelete = can('team:delete')

  const { members, loading, error, create, update, remove, reorder } = useTeamCrud(table)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TeamMemberInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberRow | null>(null)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imageSearch, setImageSearch] = useState('')

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sort_order: members.length })
    setImageSearch('')
    setSheetOpen(true)
  }

  const openEdit = (m: TeamMemberRow) => {
    setEditingId(m.id)
    setForm({
      name: m.name,
      origin: m.origin,
      role: m.role,
      bio: m.bio,
      sort_order: m.sort_order,
      active: m.active,
      image_url: m.image_url,
    })
    setImageSearch('')
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await update(editingId, form)
        toast.success('Member updated.')
      } else {
        await create(form)
        toast.success('Member added.')
      }
      setSheetOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" removed.`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleToggleActive = async (m: TeamMemberRow) => {
    try {
      await update(m.id, { active: !m.active })
      toast.success(m.active ? 'Member hidden from public site.' : 'Member shown on public site.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleReorder = async (m: TeamMemberRow, dir: 'up' | 'down') => {
    const sorted = [...members].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((x) => x.id === m.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    try {
      await Promise.all([
        reorder(m.id, swap.sort_order),
        reorder(swap.id, m.sort_order),
      ])
      // optimistic refresh is triggered inside reorder via fetch
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const sorted = [...members].sort((a, b) => a.sort_order - b.sort_order)
  const activeCount = members.filter((m) => m.active).length

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
  if (error) return <div className="py-12 text-center text-red-600 text-sm">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total members"
          value={String(members.length)}
          icon={<Users size={22} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Visible on site"
          value={String(activeCount)}
          icon={<ToggleRight size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Hidden"
          value={String(members.length - activeCount)}
          icon={<ToggleLeft size={22} weight="duotone" />}
          accent="amber"
        />
      </div>

      <SectionCard
        title={table === 'team_members' ? 'Board of Directors' : 'Operational Committee'}
        description={
          table === 'team_members'
            ? 'Manage the Board of Directors displayed on the About page.'
            : 'Manage Operational Committee members displayed on the About page.'
        }
        actions={
          canCreate ? (
            <Button
              onClick={openCreate}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
            >
              <PlusCircle className="mr-2" weight="bold" size={16} />
              Add member
            </Button>
          ) : undefined
        }
      >
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IdentificationBadge size={36} weight="duotone" />}
            title="No members yet"
            description="Add the first member to display them on the About page."
            action={
              canCreate ? (
                <Button
                  size="sm"
                  onClick={openCreate}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  <PlusCircle size={14} className="mr-1.5" />
                  Add member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {sorted.map((m, idx) => (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:shadow-sm transition-shadow"
              >
                {/* Avatar */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-br from-orange-100 to-amber-100 flex items-center justify-center text-orange-700 font-bold text-sm ring-1 ring-orange-200">
                  {m.name
                    .split(' ')
                    .filter((p) => !p.endsWith('.'))
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm truncate">{m.name}</span>
                    <Badge
                      variant="outline"
                      className={
                        m.active
                          ? 'bg-green-50 text-green-700 border-green-200 text-[10px]'
                          : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px]'
                      }
                    >
                      {m.active ? 'Visible' : 'Hidden'}
                    </Badge>
                  </div>
                  <p className="text-xs text-orange-700 font-medium truncate">{m.role}</p>
                  <p className="text-[11px] text-slate-400 truncate">{m.origin}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {canUpdate && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={idx === 0}
                        onClick={() => handleReorder(m, 'up')}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={idx === sorted.length - 1}
                        onClick={() => handleReorder(m, 'down')}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-500"
                        onClick={() => handleToggleActive(m)}
                        title={m.active ? 'Hide from site' : 'Show on site'}
                      >
                        {m.active ? (
                          <ToggleRight size={16} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={16} className="text-slate-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                        onClick={() => openEdit(m)}
                        title="Edit"
                      >
                        <PencilSimple size={14} />
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteTarget(m)}
                      title="Remove"
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Add / Edit slide-over */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) setSheetOpen(false) }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col"
          onFocusOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <SheetTitle>{editingId ? 'Edit member' : 'Add member'}</SheetTitle>
            <SheetDescription>
              {editingId
                ? 'Update the details for this member.'
                : 'Fill in the details to add a new member.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="tm-name">
                Full name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tm-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Priya Sharma"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tm-role">Role / Title</Label>
                <Input
                  id="tm-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Secretary"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tm-origin">Origin</Label>
                <Input
                  id="tm-origin"
                  value={form.origin}
                  onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                  placeholder="e.g. Kerala, India"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tm-bio">Bio</Label>
              <Textarea
                id="tm-bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="A short description shown on the member card…"
              />
            </div>

            {/* Photo */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Photo
              </p>
              {form.image_url ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-44 group">
                  <img
                    src={form.image_url}
                    alt="Member photo"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
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
                      onClick={() => setForm((f) => ({ ...f, image_url: null }))}
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

            <div className="flex items-center gap-6 flex-wrap">
              <div className="space-y-1.5">
                <Label htmlFor="tm-order">Sort order</Label>
                <Input
                  id="tm-order"
                  type="number"
                  min={0}
                  className="w-24"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="tm-active"
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
                <Label htmlFor="tm-active">Visible on public site</Label>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !form.name.trim()}
              onClick={handleSave}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add member'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-semibold">"{deleteTarget?.name}"</span> from
              the list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MediaPickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        selectedUrl={form.image_url}
        onSelect={(url) => setForm((f) => ({ ...f, image_url: url }))}
        onRemove={() => setForm((f) => ({ ...f, image_url: null }))}
        description="Click a photo to use it for this member."
        search={imageSearch}
        onSearchChange={setImageSearch}
      />
    </div>
  )
}

export function TeamManagementSection() {
  return (
    <div className="space-y-2">
      <Tabs defaultValue="board">
        <TabsList className="bg-slate-100 rounded-lg p-1 mb-6">
          <TabsTrigger
            value="board"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Users size={15} weight="duotone" />
            Board of Directors
          </TabsTrigger>
          <TabsTrigger
            value="ops"
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <IdentificationBadge size={15} weight="duotone" />
            Operational Committee
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board">
          <MemberList table="team_members" />
        </TabsContent>

        <TabsContent value="ops">
          <MemberList table="operational_committee_members" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
