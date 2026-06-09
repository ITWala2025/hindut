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
  TextAlignLeft,
  MegaphoneSimple,
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
import { useNewsUpdates, slugify, NEWS_CATEGORY_LABELS } from '@/hooks/useNewsUpdates'
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog'
import { useAuth } from '@/lib/auth'
import { KpiCard, SectionCard, EmptyState } from '@/components/admin/adminUi'
import type { NewsUpdate, NewsCategory } from '@/lib/types'

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  imageUrl: '',
  category: 'announcement' as NewsCategory,
  published: false,
  sortOrder: 0,
}

const CATEGORY_BADGE_CLASSES: Record<NewsCategory, string> = {
  announcement: 'bg-orange-50 text-orange-700 border-orange-200',
  milestone: 'bg-amber-50 text-amber-700 border-amber-200',
  initiative: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  community: 'bg-blue-50 text-blue-700 border-blue-200',
}

export function NewsSection() {
  const { can } = useAuth()
  const canWrite = can('services:create') || can('services:update') || can('services:delete')
  const { newsUpdates, loading, error, addNews, updateNews, deleteNews } = useNewsUpdates()

  // Form sheet
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imageSearch, setImageSearch] = useState('')
  const editorRef = useRef<TinyMCEEditor | null>(null)
  // Stable initial content for TinyMCE — must not change after editor mounts
  const editorInitialContentRef = useRef<string>('')

  // Search filter
  const [search, setSearch] = useState('')

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<NewsUpdate | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sortOrder: newsUpdates.length })
    editorInitialContentRef.current = ''
    setSlugManuallyEdited(false)
    setActiveTab('details')
    setImageSearch('')
    setDialogOpen(true)
  }

  const openEdit = (n: NewsUpdate) => {
    setEditingId(n.id)
    editorInitialContentRef.current = n.content ?? ''
    setForm({
      title: n.title,
      slug: n.slug,
      excerpt: n.excerpt,
      content: n.content,
      imageUrl: n.imageUrl ?? '',
      category: n.category,
      published: n.published,
      sortOrder: n.sortOrder,
    })
    setSlugManuallyEdited(true)
    setActiveTab('details')
    setImageSearch('')
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
      const payload = {
        ...form,
        imageUrl: form.imageUrl || null,
      }
      if (editingId) {
        await updateNews(editingId, payload)
        toast.success('News item updated.')
      } else {
        await addNews(payload)
        toast.success('News item created.')
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
      await deleteNews(deleteItem.id)
      toast.success(`"${deleteItem.title}" deleted.`)
      setDeleteItem(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleTogglePublished = async (n: NewsUpdate) => {
    try {
      await updateNews(n.id, { published: !n.published })
      toast.success(n.published ? 'News item unpublished.' : 'News item published.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleReorder = async (n: NewsUpdate, dir: 'up' | 'down') => {
    const sorted = [...newsUpdates].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex((x) => x.id === n.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    try {
      await Promise.all([
        updateNews(n.id, { sortOrder: swap.sortOrder }),
        updateNews(swap.id, { sortOrder: n.sortOrder }),
      ])
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const publishedCount = newsUpdates.filter((n) => n.published).length
  const sorted = [...newsUpdates].sort((a, b) => a.sortOrder - b.sortOrder)
  const filtered = search.trim()
    ? sorted.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : sorted

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading news...</div>
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total news items"
          value={String(newsUpdates.length)}
          icon={<MegaphoneSimple size={24} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Published"
          value={String(publishedCount)}
          icon={<Eye size={24} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Drafts"
          value={String(newsUpdates.length - publishedCount)}
          icon={<EyeSlash size={24} weight="duotone" />}
          accent="amber"
        />
      </div>

      <SectionCard
        title="News & Updates"
        description="Manage news items shown in the ticker and news page"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              className="h-8 w-52 text-sm"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {canWrite && (
              <Button
                onClick={openCreate}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <PlusCircle className="mr-2" weight="bold" />
                Add news item
              </Button>
            )}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching news items' : 'No news items yet'}
            description={search ? 'Try a different search term.' : 'Create your first news item to get started.'}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((n, idx) => (
              <div
                key={n.id}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                {/* Thumbnail */}
                <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  {n.imageUrl ? (
                    <img
                      src={n.imageUrl}
                      alt={n.title}
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
                    <span className="font-semibold text-slate-900 truncate">
                      {n.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${CATEGORY_BADGE_CLASSES[n.category]}`}
                    >
                      {NEWS_CATEGORY_LABELS[n.category]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={n.published
                        ? 'bg-green-50 text-green-700 border-green-200 text-[10px]'
                        : 'bg-slate-50 text-slate-500 border-slate-200 text-[10px]'}
                    >
                      {n.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{n.excerpt || <em>No excerpt</em>}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">/{n.slug}</p>
                </div>

                {/* Sort order badge */}
                <div className="shrink-0 hidden sm:flex items-center">
                  <span className="text-xs text-slate-400 font-mono">#{n.sortOrder}</span>
                </div>

                {/* Actions */}
                {canWrite && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={idx === 0}
                      onClick={() => handleReorder(n, 'up')}
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={idx === filtered.length - 1}
                      onClick={() => handleReorder(n, 'down')}
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-500"
                      onClick={() => handleTogglePublished(n)}
                      title={n.published ? 'Unpublish' : 'Publish'}
                    >
                      {n.published ? <EyeSlash size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                      onClick={() => openEdit(n)}
                      title="Edit"
                    >
                      <PencilSimple size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteItem(n)}
                      title="Delete"
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Create / Edit slide-over */}
      <Sheet open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl p-0 gap-0 overflow-hidden flex flex-col"
          onFocusOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <SheetTitle>{editingId ? 'Edit news item' : 'New news item'}</SheetTitle>
            <SheetDescription>
              {editingId ? 'Update the news item details below.' : 'Fill in the details for the new news item.'}
            </SheetDescription>
          </SheetHeader>

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
                  <Label htmlFor="news-title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="news-title"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Temple Renovation Complete"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="news-slug">Slug</Label>
                  <Input
                    id="news-slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true)
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }}
                    placeholder="temple-renovation-complete"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="news-category">Category</Label>
                <select
                  id="news-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as NewsCategory }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {(Object.entries(NEWS_CATEGORY_LABELS) as [NewsCategory, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="news-excerpt">
                  Excerpt <span className="text-muted-foreground text-xs">(short description shown in listings)</span>
                </Label>
                <Textarea
                  id="news-excerpt"
                  rows={3}
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="A brief description shown in listings..."
                />
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="space-y-1.5">
                  <Label htmlFor="news-order">Sort order</Label>
                  <Input
                    id="news-order"
                    type="number"
                    min={0}
                    className="w-24"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch
                    id="news-published"
                    checked={form.published}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
                  />
                  <Label htmlFor="news-published">Published</Label>
                </div>
              </div>
            </TabsContent>

            {/* ── IMAGE TAB ── */}
            <TabsContent value="image" className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                News image
              </p>
              {form.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-48 group">
                  <img
                    src={form.imageUrl}
                    alt="News image"
                    className="w-full h-full object-cover"
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
                      onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
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

          <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={saving || !form.title.trim()}
              onClick={handleSave}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
            >
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create news item'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete news item confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete news item?</AlertDialogTitle>
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

      <MediaPickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        selectedUrl={form.imageUrl}
        onSelect={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        onRemove={() => setForm((f) => ({ ...f, imageUrl: '' }))}
        description="Click an image to use it for this news item."
        search={imageSearch}
        onSearchChange={setImageSearch}
      />
    </div>
  )
}
