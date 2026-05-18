import { useMemo, useRef, useState } from 'react'
import {
  Image as ImageIcon,
  UploadSimple,
  MagnifyingGlass,
  Trash,
  FolderSimple,
  Copy,
  PencilSimple,
  HardDrives,
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
import { type MediaItem } from '@/data/adminMock'
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
  const canWrite = can('manageMedia')

  const { media, loading, error, upload, update, remove: removeMedia } = useMedia()

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
          canWrite && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="group rounded-xl border border-slate-200 overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
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
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-semibold text-sm text-slate-900 truncate" title={m.title}>
                    {m.title || m.filename}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate" title={m.alt}>
                    Alt: {m.alt}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatBytes(m.sizeKb)}</span>
                    <span>{m.uploadedAt}</span>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => copyUrl(m)}
                    >
                      <Copy size={12} className="mr-1" /> URL
                    </Button>
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-slate-600 hover:bg-slate-100"
                          onClick={() => openEdit(m)}
                          title="Edit title / alt"
                        >
                          <PencilSimple size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteItem(m)}
                          title="Delete"
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
        )}
      </SectionCard>

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
    </div>
  )
}
