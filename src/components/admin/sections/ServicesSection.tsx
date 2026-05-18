import { useState, useRef } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'
// Bundle TinyMCE so it works in both dev and production without needing /tinymce/ static files
import 'tinymce/tinymce'
import 'tinymce/models/dom'
import 'tinymce/themes/silver'
import 'tinymce/icons/default'
import 'tinymce/plugins/lists'
import 'tinymce/plugins/link'
import 'tinymce/plugins/image'
import 'tinymce/plugins/charmap'
import 'tinymce/plugins/preview'
import 'tinymce/plugins/searchreplace'
import 'tinymce/plugins/fullscreen'
import 'tinymce/plugins/insertdatetime'
import 'tinymce/plugins/table'
import 'tinymce/plugins/wordcount'
import 'tinymce/plugins/autoresize'
// Inline skin CSS so TinyMCE doesn't try to fetch them over HTTP (required for Vite bundled mode)
import tinymceSkinCss from 'tinymce/skins/ui/oxide/skin.min.css?raw'
import tinymceContentCss from 'tinymce/skins/content/default/content.min.css?raw'
import tinymceContentUiCss from 'tinymce/skins/ui/oxide/content.inline.css?raw'
import {
  PlusCircle,
  PencilSimple,
  Trash,
  Eye,
  EyeSlash,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Article,
  CheckCircle,
  Link,
  TextAlignLeft,
  Tag,
  Check,
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
import { useServices, type ServiceInput } from '@/hooks/useServices'
import { useServiceCategories } from '@/hooks/useServiceCategories'
import { useMedia } from '@/hooks/useMedia'
import { useAuth } from '@/lib/auth'
import { KpiCard, SectionCard, EmptyState } from '@/components/admin/adminUi'
import type { ServiceRecord } from '@/lib/types'

const EMPTY_FORM: ServiceInput & { slug: string } = {
  title: '',
  slug: '',
  category: '',
  excerpt: '',
  content: '',
  imageUrl: '',
  published: false,
  sortOrder: 0,
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ServicesSection() {
  const { can } = useAuth()
  const canWrite = can('manageServices')
  const { services, loading, error, create, update, remove, reorder } = useServices()
  const { categories, create: createCat, rename: renameCat, remove: removeCat } = useServiceCategories()
  const { media } = useMedia()

  // Category management state
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [deleteCat, setDeleteCat] = useState<{ id: string; name: string } | null>(null)

  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceInput & { slug: string }>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [mediaSearch, setMediaSearch] = useState('')
  const editorRef = useRef<TinyMCEEditor | null>(null)
  // Stable initial content for TinyMCE - must not change after editor mounts or
  // @tinymce/tinymce-react will call resetContent() and jump the cursor to top-left.
  const editorInitialContentRef = useRef<string>('')

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<ServiceRecord | null>(null)

  // Read-only preview
  const [viewItem, setViewItem] = useState<ServiceRecord | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sortOrder: services.length })
    editorInitialContentRef.current = ''
    setSlugManuallyEdited(false)
    setActiveTab('details')
    setMediaSearch('')
    setDialogOpen(true)
  }

  const openEdit = (s: ServiceRecord) => {
    setEditingId(s.id)
    editorInitialContentRef.current = s.content ?? ''
    setForm({
      title: s.title,
      slug: s.slug,
      category: s.category,
      excerpt: s.excerpt,
      content: s.content,
      imageUrl: s.imageUrl,
      published: s.published,
      sortOrder: s.sortOrder,
    })
    setSlugManuallyEdited(true)
    setActiveTab('details')
    setMediaSearch('')
    setDialogOpen(true)
  }

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugManuallyEdited ? f.slug : slugify(title),
    }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      // form.content is kept in sync by onEditorChange; falls back to initialValue if editor never mounted
      const payload = { ...form }
      if (editingId) {
        await update(editingId, payload)
        toast.success('Service updated.')
      } else {
        await create(payload)
        toast.success('Service created.')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await remove(deleteItem.id)
      toast.success(`"${deleteItem.title}" deleted.`)
      setDeleteItem(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleTogglePublished = async (s: ServiceRecord) => {
    try {
      await update(s.id, { published: !s.published })
      toast.success(s.published ? 'Service unpublished.' : 'Service published.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleReorder = async (s: ServiceRecord, dir: 'up' | 'down') => {
    const sorted = [...services].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex((x) => x.id === s.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    try {
      await Promise.all([
        reorder(s.id, swap.sortOrder),
        reorder(swap.id, s.sortOrder),
      ])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      await createCat(newCatName)
      toast.success(`Category "${newCatName}" added.`)
      setNewCatName('')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAddingCat(false)
    }
  }

  const handleRenameCategory = async () => {
    if (!editingCatId || !editingCatName.trim()) return
    try {
      await renameCat(editingCatId, editingCatName)
      toast.success('Category renamed.')
      setEditingCatId(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCat) return
    try {
      await removeCat(deleteCat.id)
      toast.success(`Category "${deleteCat.name}" deleted.`)
      setDeleteCat(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const sorted = [...services].sort((a, b) => a.sortOrder - b.sortOrder)
  const published = services.filter((s) => s.published).length
  const categoryNames = categories.map((c) => c.name)

  // Group by category order from DB, then uncategorised
  const grouped = categories.map((cat) => ({
    label: cat.name,
    items: sorted.filter((s) => s.category === cat.name),
  })).filter((g) => g.items.length > 0)
  const uncategorised = sorted.filter((s) => !categoryNames.includes(s.category))

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading services...</div>
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total services"
          value={String(services.length)}
          icon={<Article size={24} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Published"
          value={String(published)}
          icon={<Eye size={24} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Drafts"
          value={String(services.length - published)}
          icon={<EyeSlash size={24} weight="duotone" />}
          accent="amber"
        />
      </div>

      {/* ── CATEGORIES MANAGEMENT ── */}
      {canWrite && (
        <SectionCard
          title="Service Categories"
          description="Manage the categories that group your services."
          actions={
            <div className="flex items-center gap-2">
              <Input
                className="h-8 w-52 text-sm"
                placeholder="New category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory() }}
              />
              <Button
                size="sm"
                disabled={!newCatName.trim() || addingCat}
                onClick={handleAddCategory}
                className="bg-orange-600 text-white hover:bg-orange-700 h-8"
              >
                <PlusCircle size={14} className="mr-1" />
                Add
              </Button>
            </div>
          }
        >
          {categories.length === 0 ? (
            <EmptyState title="No categories yet" description="Add a category to organise your services." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
                >
                  <Tag size={13} weight="duotone" className="text-orange-500 shrink-0" />
                  {editingCatId === cat.id ? (
                    <>
                      <input
                        autoFocus
                        className="w-36 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameCategory()
                          if (e.key === 'Escape') setEditingCatId(null)
                        }}
                      />
                      <button onClick={handleRenameCategory} className="text-green-600 hover:text-green-700" title="Save">
                        <Check size={13} weight="bold" />
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="text-slate-400 hover:text-slate-600" title="Cancel">
                        <X size={13} weight="bold" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700">{cat.name}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700"
                        title="Rename"
                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                      >
                        <PencilSimple size={12} />
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                        title="Delete"
                        onClick={() => setDeleteCat({ id: cat.id, name: cat.name })}
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard
        title="Services"
        description="Manage the services displayed on the public site."
        actions={
          canWrite && (
            <Button
              onClick={openCreate}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
            >
              <PlusCircle className="mr-2" weight="bold" />
              New service
            </Button>
          )
        }
      >
        {services.length === 0 ? (
          <EmptyState title="No services yet" description="Create your first service to get started." />
        ) : (
          <div className="space-y-6">
            {[...grouped, ...(uncategorised.length > 0 ? [{ label: 'Uncategorised', items: uncategorised }] : [])].map((group) => (
              <div key={group.label}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-orange-600">{group.label}</span>
                  <div className="flex-1 h-px bg-orange-100" />
                  <span className="text-[11px] text-slate-400">{group.items.length} service{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
                    >
                      {/* Thumbnail */}
                      <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        {s.imageUrl ? (
                          <img
                            src={s.imageUrl}
                            alt={s.title}
                            className="h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={20} weight="duotone" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <button
                            className="font-semibold text-slate-900 truncate hover:text-orange-600 hover:underline underline-offset-2 text-left transition-colors"
                            onClick={() => setViewItem(s)}
                            title="Preview service"
                          >
                            {s.title}
                          </button>
                          <Badge
                            variant="outline"
                            className={s.published
                              ? 'bg-green-50 text-green-700 border-green-200 text-[10px]'
                              : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px]'}
                          >
                            {s.published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{s.excerpt || <em>No excerpt</em>}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">/{s.slug}</p>
                      </div>

                      {/* Actions */}
                      {canWrite && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={idx === 0}
                            onClick={() => handleReorder(s, 'up')}
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={idx === group.items.length - 1}
                            onClick={() => handleReorder(s, 'down')}
                            title="Move down"
                          >
                            <ArrowDown size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500"
                            onClick={() => handleTogglePublished(s)}
                            title={s.published ? 'Unpublish' : 'Publish'}
                          >
                            {s.published ? <EyeSlash size={14} /> : <Eye size={14} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                            onClick={() => openEdit(s)}
                            title="Edit"
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                            onClick={() => setDeleteItem(s)}
                            title="Delete"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Read-only preview modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null) }}>
        <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">{viewItem?.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {viewItem?.category && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">
                      <Tag size={11} weight="duotone" />
                      {viewItem.category}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={viewItem?.published
                      ? 'bg-green-50 text-green-700 border-green-200 text-[10px]'
                      : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px]'}
                  >
                    {viewItem?.published ? 'Published' : 'Draft'}
                  </Badge>
                  <span className="text-[11px] text-slate-400">/{viewItem?.slug}</span>
                </div>
              </div>
              {viewItem?.imageUrl && (
                <img
                  src={viewItem.imageUrl}
                  alt={viewItem.title}
                  className="h-16 w-16 rounded-lg object-cover border border-slate-200 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {viewItem?.excerpt && (
              <p className="text-sm text-slate-600 italic border-l-4 border-orange-200 pl-3">{viewItem.excerpt}</p>
            )}
            {viewItem?.content ? (
              <div
                className="rich-content"
                dangerouslySetInnerHTML={{ __html: viewItem.content }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">No content yet.</p>
            )}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <span>Created: {viewItem?.createdAt}</span>
              <span>Updated: {viewItem?.updatedAt}</span>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setViewItem(null)}>Close</Button>
            {canWrite && (
              <Button
                size="sm"
                className="bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => { if (viewItem) { openEdit(viewItem); setViewItem(null) } }}
              >
                <PencilSimple size={13} className="mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent
          className="sm:max-w-4xl w-full max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden"
          onFocusOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogTitle>{editingId ? 'Edit service' : 'New service'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the service details below.' : 'Fill in the details for the new service.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 mt-4 shrink-0 grid grid-cols-3 bg-slate-100 rounded-lg p-1">
              <TabsTrigger value="details" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <TextAlignLeft size={14} weight="duotone" />
                Details
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ImageIcon size={14} weight="duotone" />
                Image
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Article size={14} weight="duotone" />
                Content
              </TabsTrigger>
            </TabsList>

            {/* ── DETAILS TAB ── */}
            <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="svc-title"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Mangala Aarti"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="svc-slug">Slug</Label>
                  <Input
                    id="svc-slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true)
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }}
                    placeholder="mangala-aarti"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="svc-category">Category</Label>
                <select
                  id="svc-category"
                  value={form.category ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">— No category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="svc-excerpt">
                  Excerpt <span className="text-muted-foreground text-xs">(short description shown in listings)</span>
                </Label>
                <Textarea
                  id="svc-excerpt"
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="A brief description shown in listings..."
                />
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-order">Sort order</Label>
                  <Input
                    id="svc-order"
                    type="number"
                    min={0}
                    className="w-24"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch
                    id="svc-published"
                    checked={form.published}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
                  />
                  <Label htmlFor="svc-published">Published</Label>
                </div>
              </div>
            </TabsContent>

            {/* ── IMAGE TAB ── */}
            <TabsContent value="image" className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* URL input */}
              <div className="space-y-1.5">
                <Label htmlFor="svc-image" className="flex items-center gap-1.5">
                  <Link size={14} weight="bold" />
                  Image URL
                </Label>
                <Input
                  id="svc-image"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://... or select from media library below"
                />
              </div>

              {/* Selected preview */}
              {form.imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-44 bg-slate-50">
                  <img
                    src={form.imageUrl}
                    alt="Selected"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <button
                    onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 rounded-full px-2 py-0.5 text-xs font-medium shadow"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Media library picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <ImageIcon size={14} weight="duotone" />
                    Pick from Media Library
                  </Label>
                  <Input
                    className="w-48 h-7 text-xs"
                    placeholder="Search..."
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                  {media
                    .filter((m) =>
                      !mediaSearch ||
                      m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                      m.filename.toLowerCase().includes(mediaSearch.toLowerCase())
                    )
                    .map((m) => {
                      const selected = form.imageUrl === m.url
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, imageUrl: m.url }))}
                          className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selected
                              ? 'border-orange-500 ring-2 ring-orange-200'
                              : 'border-transparent hover:border-slate-300'
                          }`}
                          title={m.title}
                        >
                          <img src={m.url} alt={m.alt} className="h-full w-full object-cover" />
                          {selected && (
                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                              <CheckCircle size={20} weight="fill" className="text-orange-600 drop-shadow" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  {media.length === 0 && (
                    <p className="col-span-full text-center text-xs text-muted-foreground py-8">
                      No media items found. Upload images in the Media Library section.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── CONTENT TAB ── */}
            <TabsContent value="content" className="flex-1 flex flex-col min-h-0 px-6 py-5">
              <Label className="mb-2 shrink-0">Content</Label>
              <div className="flex-1 min-h-0 rounded-lg border border-slate-200">
                <Editor
                  key={editingId ?? 'new'}
                  licenseKey="gpl"
                  onInit={(_evt, editor) => {
                    editorRef.current = editor
                    // TinyMCE appends .tox-tinymce-aux to <body>, outside Radix Dialog's portal.
                    // Radix marks everything outside the dialog as `inert`, blocking all pointer
                    // events on TinyMCE's toolbar overflow panel, menus, and dialogs.
                    // Fix: move the aux container inside the dialog so Radix leaves it alone.
                    const dialogEl = editor.getContainer()?.closest('[role="dialog"]') as HTMLElement | null
                    const aux = document.querySelector('body > .tox-tinymce-aux') as HTMLElement | null
                    if (dialogEl && aux) dialogEl.appendChild(aux)
                  }}
                  onEditorChange={(newContent) => setForm((f) => ({ ...f, content: newContent }))}
                  onRemove={() => { editorRef.current = null }}
                  initialValue={editorInitialContentRef.current}
                  init={{
                    height: '100%',
                    min_height: 480,
                    resize: false,
                    menubar: true,
                    branding: false,
                    promotion: false,
                    skin: false,
                    content_css: false,
                    setup: (editor) => {
                      editor.on('init', () => {
                        // Inject oxide UI skin into the host document (toolbar/chrome styles)
                        if (!document.getElementById('tinymce-skin-css')) {
                          const style = document.createElement('style')
                          style.id = 'tinymce-skin-css'
                          style.textContent = tinymceSkinCss
                          document.head.appendChild(style)
                        }
                      })
                      // When the user explicitly switches to Paragraph from the blocks
                      // dropdown, strip bold and italic so the text returns to plain style.
                      editor.on('FormatApply', (e) => {
                        if (e.format === 'p') {
                          editor.formatter.remove('bold')
                          editor.formatter.remove('italic')
                        }
                      })
                    },
                    plugins: [
                      'lists', 'link', 'image', 'charmap', 'preview',
                      'searchreplace', 'fullscreen', 'insertdatetime',
                      'table', 'wordcount', 'autoresize',
                    ],
                    toolbar:
                      'undo redo | blocks | bold italic underline strikethrough | ' +
                      'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                      'bullist numlist outdent indent | link image table | ' +
                      'removeformat | fullscreen preview',
                    block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote',
                    content_style:
                      tinymceContentCss + '\n' + tinymceContentUiCss + '\n' +
                      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 15px; line-height: 1.6; padding: 12px 16px; }' +
                      'ul, ol { padding-left: 1.6em; margin: 0.6em 0; }' +
                      'ul { list-style-type: disc; } ol { list-style-type: decimal; }' +
                      'li { margin: 0.3em 0; } li > ul, li > ol { margin: 0.2em 0; }',
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={saving || !form.title.trim()}
              onClick={handleSave}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold">"{deleteItem?.title}"</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
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
