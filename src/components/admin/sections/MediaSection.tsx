import { useMemo, useRef, useState } from 'react'
import {
  Image as ImageIcon,
  UploadSimple,
  MagnifyingGlass,
  Trash,
  FolderSimple,
  Copy,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { MOCK_MEDIA, type MediaItem } from '@/data/adminMock'
import { useAuth } from '@/lib/auth'
import { KpiCard, SectionCard, EmptyState } from '@/components/admin/adminUi'

type FolderFilter = 'all' | MediaItem['folder']

const FOLDERS: MediaItem['folder'][] = ['events', 'temple', 'community', 'general']

export function MediaSection() {
  const { can, user } = useAuth()
  const canWrite = can('manageMedia')

  const [media, setMedia] = useState<MediaItem[]>(MOCK_MEDIA)
  const [folder, setFolder] = useState<FolderFilter>('all')
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const filtered = useMemo(() => {
    return media.filter((m) => {
      if (folder !== 'all' && m.folder !== folder) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return m.filename.toLowerCase().includes(q) || m.alt.toLowerCase().includes(q)
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newItems: MediaItem[] = Array.from(files).map((f, idx) => ({
      id: `media-${Date.now()}-${idx}`,
      filename: f.name,
      url: URL.createObjectURL(f),
      folder: folder === 'all' ? 'general' : folder,
      sizeKb: Math.round(f.size / 1024),
      uploadedBy: user?.email ?? 'unknown',
      uploadedAt: new Date().toISOString().slice(0, 10),
      alt: f.name.replace(/\.[^.]+$/, ''),
    }))
    setMedia((prev) => [...newItems, ...prev])
    toast.success(`Uploaded ${newItems.length} file${newItems.length === 1 ? '' : 's'}.`)
    e.target.value = ''
  }

  const remove = (m: MediaItem) => {
    setMedia((prev) => prev.filter((x) => x.id !== m.id))
    toast.success(`Removed ${m.filename}.`)
  }

  const copyUrl = async (m: MediaItem) => {
    try {
      await navigator.clipboard.writeText(m.url)
      toast.success('URL copied to clipboard.')
    } catch {
      toast.error('Unable to copy URL.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Media items"
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
          value={`${(totals.kb / 1024).toFixed(1)} MB`}
          icon={<UploadSimple size={24} weight="duotone" />}
          accent="blue"
        />
      </div>

      <SectionCard
        title="Media library"
        description="Centralised storage for images used on the public site and in events."
        actions={
          canWrite && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <UploadSimple className="mr-2" weight="bold" />
                Upload images
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
              placeholder="Search by filename or alt text…"
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
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={m.url}
                    alt={m.alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.opacity = '0.3'
                    }}
                  />
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {m.filename}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {m.folder}
                    </Badge>
                    <span>{(m.sizeKb / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {m.uploadedBy} · {m.uploadedAt}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:bg-red-50"
                        onClick={() => remove(m)}
                      >
                        <Trash size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
