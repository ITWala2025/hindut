import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  MagnifyingGlass,
  DownloadSimple,
  Receipt as ReceiptIcon,
  FileText,
  FloppyDisk,
  PencilSimple,
  Trash,
  ArrowsClockwise,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  type ReceiptRecord,
  type ReceiptType,
} from '@/lib/types'
import { useReceipts } from '@/hooks/useReceipts'
import { useAuth } from '@/lib/auth'
import { downloadReceiptPdf } from '@/lib/receiptPdf'
import {
  KpiCard,
  SectionCard,
  DataTable,
  Th,
  Td,
  EmptyState,
} from '@/components/admin/adminUi'

type TypeFilter = 'all' | ReceiptType
type SourceFilter = 'all' | 'auto' | 'manual'

const PAGE_SIZE = 20

interface ReceiptFormState {
  recipientName: string
  recipientEmail: string
  amount: number
  description: string
  type: ReceiptType
  templateId: string
  paymentReference: string
  issuedDate: string
}

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM: ReceiptFormState = {
  recipientName: '',
  recipientEmail: '',
  amount: 0,
  description: '',
  type: 'donation',
  templateId: 'tmpl-donation',
  paymentReference: '',
  issuedDate: TODAY(),
}

export function ReceiptsSection() {
  const { can } = useAuth()
  const canCreate = can('receipts:create')
  const canUpdate = can('receipts:update')
  const canDelete = can('receipts:delete')
  const canWrite = canCreate || canUpdate || canDelete
  const {
    receipts,
    templates,
    loading,
    error,
    createManualReceipt,
    updateReceipt,
    deleteReceipt,
    saveTemplate,
    refetch,
  } = useReceipts()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [page, setPage] = useState(1)

  // Create / edit dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ReceiptRecord | null>(null)
  const [form, setForm] = useState<ReceiptFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ReceiptRecord | null>(null)

  // Template editing
  const [activeTemplateId, setActiveTemplateId] = useState<string>('')
  const [templateDraft, setTemplateDraft] = useState<string>('')

  useEffect(() => {
    if (templates.length && !activeTemplateId) {
      setActiveTemplateId(templates[0].id)
      setTemplateDraft(templates[0].body)
    }
  }, [templates, activeTemplateId])

  const activeTemplate = templates.find((t) => t.id === activeTemplateId)

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (sourceFilter === 'manual' && !r.isManual) return false
      if (sourceFilter === 'auto' && r.isManual) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        r.receiptNumber.toLowerCase().includes(q) ||
        r.recipientName.toLowerCase().includes(q) ||
        r.recipientEmail.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.paymentReference ?? '').toLowerCase().includes(q)
      )
    })
  }, [receipts, search, typeFilter, sourceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const totals = useMemo(() => {
    return {
      issued: receipts.length,
      euro: receipts.reduce((s, r) => s + r.amount, 0),
      manual: receipts.filter((r) => r.isManual).length,
      auto: receipts.filter((r) => !r.isManual).length,
    }
  }, [receipts])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, issuedDate: TODAY() })
    setFormOpen(true)
  }

  const openEdit = (r: ReceiptRecord) => {
    setEditing(r)
    setForm({
      recipientName: r.recipientName,
      recipientEmail: r.recipientEmail,
      amount: r.amount,
      description: r.description,
      type: r.type,
      templateId: r.templateId ?? `tmpl-${r.type}`,
      paymentReference: r.paymentReference ?? '',
      issuedDate: r.issuedDate || TODAY(),
    })
    setFormOpen(true)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (
      !form.recipientName.trim() ||
      !form.recipientEmail.trim() ||
      !form.description.trim() ||
      form.amount <= 0
    ) {
      toast.error('All fields are required and amount must be positive.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateReceipt(editing.id, {
          recipientName: form.recipientName.trim(),
          recipientEmail: form.recipientEmail.trim(),
          amount: form.amount,
          type: form.type,
          description: form.description.trim(),
          paymentReference: form.paymentReference.trim() || undefined,
          issuedDate: form.issuedDate || undefined,
          templateId: form.templateId,
        })
        toast.success(`Receipt ${editing.receiptNumber} updated.`)
      } else {
        const newReceipt = await createManualReceipt({
          recipientName: form.recipientName.trim(),
          recipientEmail: form.recipientEmail.trim(),
          amount: form.amount,
          type: form.type,
          description: form.description.trim(),
          paymentReference: form.paymentReference.trim() || undefined,
          issuedDate: form.issuedDate || undefined,
          templateId: form.templateId,
        })
        toast.success(`Receipt ${newReceipt.receiptNumber} issued.`)
      }
      setFormOpen(false)
      setEditing(null)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save receipt.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteReceipt(deleteTarget.id)
      toast.success(`Receipt ${deleteTarget.receiptNumber} deleted.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete receipt.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDownload = async (r: ReceiptRecord) => {
    try {
      await downloadReceiptPdf(r)
    } catch (err) {
      toast.error((err as Error).message ?? 'PDF generation failed.')
    }
  }

  const handleSaveTemplate = async () => {
    if (!activeTemplate) return
    try {
      await saveTemplate({
        id: activeTemplate.id,
        name: activeTemplate.name,
        body: templateDraft,
      })
      toast.success(`Template "${activeTemplate.name}" saved.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save template.')
    }
  }

  const onSelectTemplate = (id: string) => {
    setActiveTemplateId(id)
    const t = templates.find((t) => t.id === id)
    if (t) setTemplateDraft(t.body)
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading receipts…</div>
  if (error) return <div className="p-8 text-center text-red-600">Error loading receipts: {error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receipts issued"
          value={String(totals.issued)}
          icon={<ReceiptIcon size={24} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Total amount"
          value={`€${totals.euro.toLocaleString('en-IE', { minimumFractionDigits: 2 })}`}
          icon={<FileText size={24} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Auto-generated"
          value={String(totals.auto)}
          icon={<ReceiptIcon size={24} weight="duotone" />}
          accent="blue"
        />
        <KpiCard
          label="Manual / offline"
          value={String(totals.manual)}
          icon={<ReceiptIcon size={24} weight="duotone" />}
          accent="amber"
        />
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">All receipts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <SectionCard
            title="Receipts"
            description="Receipts are auto-generated for ticket bookings, paid memberships and successful donations. You can also manually issue receipts for offline / cash transactions."
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetch}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <ArrowsClockwise size={15} className="mr-1.5" />
                  Refresh
                </Button>
                {canCreate && (
                  <Button
                    onClick={openCreate}
                    className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
                  >
                    <Plus className="mr-2" weight="bold" /> Manual receipt
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
                  placeholder="Search by receipt #, name, email, description, payment ref…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v as TypeFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger className="md:w-44">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="event">Event ticket</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sourceFilter}
                onValueChange={(v) => {
                  setSourceFilter(v as SourceFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger className="md:w-44">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="auto">Auto-generated</SelectItem>
                  <SelectItem value="manual">Manual / offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                title="No receipts found"
                description="Adjust your filters or issue a new manual receipt."
              />
            ) : (
              <>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Receipt #</Th>
                      <Th>Recipient</Th>
                      <Th>Type</Th>
                      <Th>Source</Th>
                      <Th>Description</Th>
                      <Th>Date</Th>
                      <Th>Amount</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <Td className="font-mono text-xs font-semibold text-slate-900">
                          {r.receiptNumber}
                        </Td>
                        <Td>
                          <div className="font-semibold text-slate-900">{r.recipientName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.recipientEmail}
                          </div>
                        </Td>
                        <Td>
                          <Badge
                            className={
                              r.type === 'donation'
                                ? 'bg-emerald-600 text-white capitalize'
                                : r.type === 'membership'
                                  ? 'bg-orange-600 text-white capitalize'
                                  : 'bg-indigo-600 text-white capitalize'
                            }
                          >
                            {r.type}
                          </Badge>
                        </Td>
                        <Td>
                          {r.isManual ? (
                            <Badge className="bg-amber-500 text-white">Manual</Badge>
                          ) : (
                            <Badge className="bg-slate-500 text-white">Auto</Badge>
                          )}
                        </Td>
                        <Td className="text-slate-700 max-w-xs truncate">{r.description}</Td>
                        <Td>{r.issuedDate}</Td>
                        <Td className="font-semibold text-emerald-700">
                          €{r.amount.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                        </Td>
                        <Td className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(r)}
                            className="text-indigo-700 hover:bg-indigo-50"
                            title="Download PDF"
                          >
                            <DownloadSimple size={16} />
                          </Button>
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(r)}
                              className="text-slate-600 hover:bg-slate-100"
                              title="Edit"
                            >
                              <PencilSimple size={16} />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(r)}
                              className="text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash size={16} />
                            </Button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>

                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <div>
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <SectionCard
            title="Receipt templates"
            description="Edit the HTML used by the legacy email templates. PDF generation uses a built-in branded layout; templates are still used for email previews. Supports {{receiptId}}, {{recipientName}}, {{amount}}, {{date}}, {{description}}."
            actions={
              canWrite && (
                <Button
                  onClick={handleSaveTemplate}
                  className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
                >
                  <FloppyDisk className="mr-2" weight="bold" /> Save template
                </Button>
              )
            }
          >
            <div className="mb-4">
              <Label className="text-sm font-semibold">Template</Label>
              <Select value={activeTemplateId} onValueChange={onSelectTemplate}>
                <SelectTrigger className="mt-1.5 max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={14}
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              disabled={!canWrite}
              className="font-mono text-xs"
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditing(null) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptIcon weight="duotone" size={24} className="text-orange-600" />
              {editing ? `Edit receipt ${editing.receiptNumber}` : 'Manual receipt'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the receipt details. Changes are saved immediately.'
                : 'Issue a receipt for an offline / cash transaction. A receipt number is generated automatically.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Recipient name</Label>
                <Input
                  value={form.recipientName}
                  onChange={(e) =>
                    setForm({ ...form, recipientName: e.target.value })
                  }
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Recipient email</Label>
                <Input
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) =>
                    setForm({ ...form, recipientEmail: e.target.value })
                  }
                  className="mt-1.5"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm font-semibold">Amount (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount || ''}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      type: v as ReceiptType,
                      templateId: `tmpl-${v}`,
                    })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="donation">Donation</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="event">Event ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">Issue date</Label>
                <Input
                  type="date"
                  value={form.issuedDate}
                  onChange={(e) =>
                    setForm({ ...form, issuedDate: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className="mt-1.5"
                required
                placeholder="e.g. Cash donation for Diwali event, received in temple office"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">
                Payment reference (optional)
              </Label>
              <Input
                value={form.paymentReference}
                onChange={(e) =>
                  setForm({ ...form, paymentReference: e.target.value })
                }
                className="mt-1.5"
                placeholder="e.g. Cash, Cheque #12345, Bank transfer ref…"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setFormOpen(false); setEditing(null) }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
              >
                <FloppyDisk className="mr-2" weight="bold" />
                {editing ? 'Save changes' : 'Issue receipt'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              Receipt <strong>{deleteTarget?.receiptNumber}</strong> for{' '}
              <strong>{deleteTarget?.recipientName}</strong> (€
              {deleteTarget?.amount.toLocaleString('en-IE', { minimumFractionDigits: 2 })}) will
              be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
