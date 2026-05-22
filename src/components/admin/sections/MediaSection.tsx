import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Image as ImageIcon,
  UploadSimple,
  MagnifyingGlass,
  Trash,
  FolderSimple,
  Copy,
  PencilSimple,
  HardDrives,
  LinkSimple,
  ArrowSquareOut,
  ImagesSquare,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { type MediaItem } from '@/lib/types'
import { useMedia } from '@/hooks/useMedia'
import { useAuth } from '@/lib/auth'
import { KpiCard, SectionCard, EmptyState } from '@/components/admin/adminUi'

type FolderFilter = 'all' | MediaItem['folder']

const FOLDERS: MediaItem['folder'][] = ['events', 'temple', 'community', 'general', 'gallery-webp']

function formatBytes(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function MediaSection() {
  const { can } = useAuth()
  const canCreate = can('media:create')
  const canUpdate = can('media:update')
  const canDelete = can('media:delete')
  const canWrite = canCreate || canUpdate || canDelete

  const { media, loading, error, upload, addExternal, addAlbum, update, remove: removeMedia } = useMedia()

  const [folder, setFolder] = useState<FolderFilter>('all')
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Upload dialog
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string>('')
  const [uploadForm, setUploadForm] = useState({
    title: '',
    alt: '',
    folder: 'general' as MediaItem['folder'],
  })
  const [uploading, setUploading] = useState(false)

  // Edit dialog
  const [editItem, setEditItem] = useState<MediaItem | null>(null)
  const [editForm, setEditForm] = useState({ title: '', alt: '' })
  const [saving, setSaving] = useState(false)

  // External link dialog
  const [externalOpen, setExternalOpen] = useState(false)
  const [externalForm, setExternalForm] = useState({
    url: '',
    title: '',
    alt: '',
    folder: 'general' as MediaItem['folder'],
  })
  const [externalSaving, setExternalSaving] = useState(false)

  // Album dialog
  const [albumOpen, setAlbumOpen] = useState(false)
  const [albumForm, setAlbumForm] = useState({
    url: '',
    title: '',
    thumbnailUrl: '',
    folder: 'general' as MediaItem['folder'],
  })
  const [albumSaving, setAlbumSaving] = useState(false)
  const [albumFetching, setAlbumFetching] = useState(false)

  // Auto-fetch OG image when the album URL is pasted
  useEffect(() => {
    const url = albumForm.url.trim()
    if (!url || !albumOpen) return
    const t = setTimeout(async () => {
      setAlbumFetching(true)
      try {
        const res = await fetch(`/.netlify/functions/fetch-og-image?url=${encodeURIComponent(url)}`)
        if (res.status === 200) {
          const { thumbnail } = await res.json() as { thumbnail: string }
          if (thumbnail) setAlbumForm((f) => ({ ...f, thumbnailUrl: thumbnail }))
        }
      } catch {
        // silent — user can still proceed without a thumbnail
      } finally {
        setAlbumFetching(false)
      }
    }, 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumForm.url, albumOpen])

  // Pagination
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)

  // Delete confirm
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null)

  const filtered = useMemo(() => {
    return media.filter((m) => {
      if (folder !== 'all' && m.folder !== folder) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        m.filename.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.alt.toLowerCase().includes(q)
      )
    })
  }, [media, folder, search])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [folder, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totals = useMemo(
    () => ({
      total: media.length,
      kb: media.reduce((s, m) => s + m.sizeKb, 0),
      folders: new Set(media.map((m) => m.folder)).size,
    }),
    [media],
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPendingFile(file)
    setUploadPreview(preview)
    setUploadForm({
      title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      alt: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      folder: folder !== 'all' ? folder : 'general',
    })
    e.target.value = ''
  }

  const handleUploadConfirm = async () => {
    if (!pendingFile) return
    setUploading(true)
    try {
      await upload(pendingFile, uploadForm.folder, uploadForm.alt, uploadForm.title)
      toast.success(`Uploaded "${uploadForm.title}".`)
      setPendingFile(null)
      URL.revokeObjectURL(uploadPreview)
      setUploadPreview('')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const openEdit = (m: MediaItem) => {
    setEditItem(m)
    setEditForm({ title: m.title, alt: m.alt })
  }

  const handleEditSave = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      await update(editItem.id, { title: editForm.title, alt: editForm.alt })
      toast.success('Image details updated.')
      setEditItem(null)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleExternalConfirm = async () => {
    setExternalSaving(true)
    try {
      await addExternal(externalForm.url.trim(), externalForm.folder, externalForm.alt.trim() || undefined, externalForm.title.trim() || undefined)
      toast.success('External image added.')
      setExternalOpen(false)
      setExternalForm({ url: '', title: '', alt: '', folder: 'general' })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setExternalSaving(false)
    }
  }

  const handleAlbumConfirm = async () => {
    if (!albumForm.url.trim() || !albumForm.title.trim()) return
    setAlbumSaving(true)
    try {
      await addAlbum(albumForm.url.trim(), albumForm.folder, albumForm.title.trim(), albumForm.thumbnailUrl.trim() || undefined)
      toast.success('Photo album added.')
      setAlbumOpen(false)
      setAlbumForm({ url: '', title: '', thumbnailUrl: '', folder: 'general' })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAlbumSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    try {
      await removeMedia(deleteItem.id)
      toast.success(`Removed "${deleteItem.title || deleteItem.filename}".`)
      setDeleteItem(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const copyUrl = async (m: MediaItem) => {
    try {
      await navigator.clipboard.writeText(m.url)
      toast.success('URL copied to clipboard.')
    } catch {
      toast.error('Unable to copy URL.')
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading media...</div>
  if (error) return <div className="p-8 text-center text-red-600">Error loading media: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Images"
          value={String(totals.total)}
          icon={<ImageIcon size={24} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Folders"
          value={String(totals.folders)}
          icon={<FolderSimple size={24} weight="duotone" />}
          accent="amber"
        />
        <KpiCard
          label="Storage used"
          value={formatBytes(totals.kb)}
          icon={<HardDrives size={24} weight="duotone" />}
          accent="blue"
        />
        <KpiCard
          label="Avg size"
          value={totals.total ? formatBytes(Math.round(totals.kb / totals.total)) : 'n/a'}
          icon={<UploadSimple size={24} weight="duotone" />}
          accent="green"
        />
      </div>

      <SectionCard
        title="Media library"
        description="Upload and manage images used on the public site and in events."
        actions={
          canCreate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => setExternalOpen(true)}
                className="font-semibold"
              >
                <LinkSimple className="mr-2" weight="bold" />
                Add external link
              </Button>
              <Button
                variant="outline"
                onClick={() => setAlbumOpen(true)}
                className="font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <ImagesSquare className="mr-2" weight="bold" />
                Add photo album
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <UploadSimple className="mr-2" weight="bold" />
                Upload image
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by filename, title or alt text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={folder} onValueChange={(v) => setFolder(v as FolderFilter)}>
            <SelectTrigger className="md:w-56">
              <SelectValue placeholder="All folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              {FOLDERS.map((f) => (
                <SelectItem key={f} value={f} className="capitalize">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No media found"
            description="Upload images or change your filters."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginated.map((m) => (
              <div
                key={m.id}
                className="group rounded-xl border border-slate-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                {m.mediaType === 'album' ? (
                  /* ── Album card ── */
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="aspect-square relative overflow-hidden bg-linear-to-br from-indigo-500 to-purple-600">
                      {m.thumbnailUrl && (
                        <img
                          src={m.thumbnailUrl}
                          alt={m.title}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      {/* dark scrim so title + badges are always readable */}
                      <div className="absolute inset-0 bg-black/30" />
                      {!m.thumbnailUrl && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <ImagesSquare size={48} weight="duotone" className="text-white/90" />
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="absolute top-2 right-2 bg-black/50 text-white border-white/30 text-[10px] flex items-center gap-1 z-10"
                      >
                        <ArrowSquareOut size={10} />
                        Album
                      </Badge>
                      <Badge
                        variant="outline"
                        className="absolute top-2 left-2 capitalize bg-black/50 text-white border-white/30 text-[10px] z-10"
                      >
                        {m.folder}
                      </Badge>
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-2 pt-6 pb-2 z-10">
                        <span className="text-white text-xs font-semibold line-clamp-2 leading-tight">{m.title}</span>
                      </div>
                    </div>
                  </a>
                ) : (
                  /* ── Image card thumbnail ── */
                  <div className="aspect-square bg-slate-100 overflow-hidden relative">
                    <img
                      src={m.url}
                      alt={m.alt}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.opacity = '0.3'
                      }}
                    />
                    <Badge
                      variant="outline"
                      className="absolute top-2 left-2 capitalize bg-white/90 text-[10px]"
                    >
                      {m.folder}
                    </Badge>
                    {m.isExternal && (
                      <Badge
                        variant="outline"
                        className="absolute top-2 right-2 bg-blue-50/90 text-blue-700 border-blue-200 text-[10px] flex items-center gap-1"
                      >
                        <ArrowSquareOut size={10} />
                        External
                      </Badge>
                    )}
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <div className="font-semibold text-sm text-slate-900 truncate" title={m.title}>
                    {m.title || m.filename}
                  </div>
                  {m.mediaType === 'album' ? (
                    <div className="text-[11px] text-indigo-600 truncate" title={m.url}>
                      {m.url}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground truncate" title={m.alt}>
                      Alt: {m.alt}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{m.mediaType === 'album' ? 'Photo album' : formatBytes(m.sizeKb)}</span>
                    <span>{m.uploadedAt}</span>
                  </div>
                  <div className="flex gap-1 pt-1">
                    {m.mediaType === 'album' ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        >
                          <ArrowSquareOut size={12} className="mr-1" /> Open Album
                        </Button>
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => copyUrl(m)}
                      >
                        <Copy size={12} className="mr-1" /> URL
                      </Button>
                    )}
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-slate-600 hover:bg-slate-100"
                          onClick={() => openEdit(m)}
                          title="Edit title / alt"
                          disabled={!canUpdate}
                        >
                          <PencilSimple size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteItem(m)}
                          title="Delete"
                          disabled={!canDelete}
                        >
                          <Trash size={12} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>

            {/* Pagination bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '…')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={page === p ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => setPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    »
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {/* External link dialog */}
      <Dialog open={externalOpen} onOpenChange={(open) => { if (!open) setExternalOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add external image</DialogTitle>
            <DialogDescription>Paste a public image URL. It won't be stored in Supabase Storage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ext-url">Image URL</Label>
              <Input
                id="ext-url"
                type="url"
                value={externalForm.url}
                onChange={(e) => setExternalForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {externalForm.url.trim() && (
              <img
                src={externalForm.url.trim()}
                alt="preview"
                className="w-full max-h-40 object-contain rounded-lg border border-slate-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ext-title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="ext-title"
                value={externalForm.title}
                onChange={(e) => setExternalForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Descriptive title..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ext-alt">Alt text <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="ext-alt"
                value={externalForm.alt}
                onChange={(e) => setExternalForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Describe the image for screen readers..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Folder</Label>
              <Select
                value={externalForm.folder}
                onValueChange={(v) => setExternalForm((f) => ({ ...f, folder: v as MediaItem['folder'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalOpen(false)}>Cancel</Button>
            <Button
              disabled={externalSaving || !externalForm.url.trim()}
              onClick={handleExternalConfirm}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {externalSaving ? 'Adding...' : 'Add image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog
        open={!!pendingFile}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFile(null)
            URL.revokeObjectURL(uploadPreview)
            setUploadPreview('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload image</DialogTitle>
            <DialogDescription>Set a title and alt text before uploading.</DialogDescription>
          </DialogHeader>
          {uploadPreview && (
            <img
              src={uploadPreview}
              alt="preview"
              className="w-full max-h-48 object-contain rounded-lg border border-slate-200"
            />
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="upload-title">Title</Label>
              <Input
                id="upload-title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Descriptive title..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upload-alt">Alt text</Label>
              <Input
                id="upload-alt"
                value={uploadForm.alt}
                onChange={(e) => setUploadForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Describe the image for screen readers..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Folder</Label>
              <Select
                value={uploadForm.folder}
                onValueChange={(v) =>
                  setUploadForm((f) => ({ ...f, folder: v as MediaItem['folder'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingFile(null)
                URL.revokeObjectURL(uploadPreview)
                setUploadPreview('')
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={uploading || !uploadForm.title.trim()}
              onClick={handleUploadConfirm}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit image details</DialogTitle>
            <DialogDescription>Update the title and alt text for this image.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <img
                src={editItem.url}
                alt={editItem.alt}
                className="w-full max-h-40 object-contain rounded-lg border border-slate-200"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-alt">Alt text</Label>
                <Input
                  id="edit-alt"
                  value={editForm.alt}
                  onChange={(e) => setEditForm((f) => ({ ...f, alt: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button
              disabled={saving || !editForm.title.trim()}
              onClick={handleEditSave}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold">{deleteItem?.title || deleteItem?.filename}</span>{' '}
              from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add photo album dialog */}
      <Dialog open={albumOpen} onOpenChange={(open) => { if (!open) setAlbumOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagesSquare size={20} className="text-indigo-600" weight="duotone" />
              Add photo album
            </DialogTitle>
            <DialogDescription>
              Paste a Google Photos, Flickr, or any other shared album URL. It will be stored as a link — not downloaded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="album-url">Album URL <span className="text-red-500">*</span></Label>
              <Input
                id="album-url"
                type="url"
                value={albumForm.url}
                onChange={(e) => setAlbumForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://photos.app.goo.gl/..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="album-title">Album title <span className="text-red-500">*</span></Label>
              <Input
                id="album-title"
                value={albumForm.title}
                onChange={(e) => setAlbumForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Diwali Celebrations 2025"
              />
            </div>
            {/* Thumbnail preview — auto-fetched from og:image */}
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center" style={{ minHeight: '7rem' }}>
              {albumFetching ? (
                <span className="text-xs text-muted-foreground animate-pulse">Fetching cover image…</span>
              ) : albumForm.thumbnailUrl ? (
                <img
                  src={albumForm.thumbnailUrl}
                  alt="cover preview"
                  className="w-full max-h-36 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">Cover image will appear here after URL is entered</span>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="album-folder">Folder</Label>
              <Select
                value={albumForm.folder}
                onValueChange={(v) => setAlbumForm((f) => ({ ...f, folder: v as MediaItem['folder'] }))}
              >
                <SelectTrigger id="album-folder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlbumOpen(false)}>Cancel</Button>
            <Button
              disabled={albumSaving || !albumForm.url.trim() || !albumForm.title.trim()}
              onClick={handleAlbumConfirm}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {albumSaving ? 'Adding...' : 'Add album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
