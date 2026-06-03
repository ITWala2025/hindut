import { useMemo } from 'react'
import { MagnifyingGlass, Image as ImageIcon, Check, X } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMedia } from '@/hooks/useMedia'
import { cn } from '@/lib/utils'

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUrl: string | null | undefined
  onSelect: (url: string) => void
  onRemove?: () => void
  /** Optional text shown under the title */
  description?: string
  search: string
  onSearchChange: (q: string) => void
}

/**
 * Shared media-library picker dialog used across all admin sections.
 * Matches the Events cover-image picker exactly.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  selectedUrl,
  onSelect,
  onRemove,
  description = 'Click an image to select it.',
  search,
  onSearchChange,
}: MediaPickerDialogProps) {
  const { media } = useMedia()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? media.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.filename.toLowerCase().includes(q),
        )
      : media
  }, [media, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle
            className="text-orange-800"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Select image from Media Library
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search images…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ImageIcon size={40} weight="duotone" />
              <p className="text-sm">
                {media.length === 0
                  ? 'No images yet. Upload images in the Media Library first.'
                  : 'No images match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((item) => {
                const isSelected = selectedUrl === item.url
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.url)
                      onOpenChange(false)
                    }}
                    className={cn(
                      'relative rounded-lg overflow-hidden border-2 aspect-square focus:outline-none transition-all hover:border-orange-400',
                      isSelected
                        ? 'border-orange-500 ring-2 ring-orange-300'
                        : 'border-transparent',
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedUrl && onRemove && (
            <Button
              variant="ghost"
              onClick={() => {
                onRemove()
                onOpenChange(false)
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X size={16} className="mr-1" />
              Remove image
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
