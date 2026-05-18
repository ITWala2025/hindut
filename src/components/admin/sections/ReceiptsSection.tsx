import { useMemo, useState } from 'react'
import {
  Plus,
  MagnifyingGlass,
  DownloadSimple,
  Receipt as ReceiptIcon,
  PaperPlaneTilt,
  FileText,
  FloppyDisk,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  type ReceiptRecord,
  type ReceiptTemplate,
  type ReceiptType,
} from '@/data/adminMock'
import { useReceipts } from '@/hooks/useReceipts'
import { useAuth } from '@/lib/auth'
import {
  KpiCard,
  SectionCard,
  DataTable,
  Th,
  Td,
  EmptyState,
} from '@/components/admin/adminUi'

type TypeFilter = 'all' | ReceiptType

const PAGE_SIZE = 8

export function ReceiptsSection() {
  const { can } = useAuth()
  const canWrite = can('manageReceipts')
  const { receipts, templates, loading, error, issueReceipt: createReceipt, saveTemplate: saveTemplateToDb } = useReceipts()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [page, setPage] = useState(1)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({
    recipientName: '',
    recipientEmail: '',
    amount: 0,
    description: '',
    type: 'donation' as ReceiptType,
    templateId: 'tmpl-donation',
  })

  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id ?? '')
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? templates[0]
  const [templateDraft, setTemplateDraft] = useState<string>(activeTemplate?.body ?? '')

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        r.id.toLowerCase().includes(q) ||
        r.recipientName.toLowerCase().includes(q) ||
        r.recipientEmail.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      )
    })
  }, [receipts, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const totals = useMemo(() => {
    return {
      issued: receipts.length,
      euro: receipts.reduce((s, r) => s + r.amount, 0),
      donation: receipts.filter((r) => r.type === 'donation').length,
      membership: receipts.filter((r) => r.type === 'membership').length,
    }
  }, [receipts])

  const renderTemplate = (body: string, r: ReceiptRecord) =>
    body
      .replace(/\{\{receiptId\}\}/g, r.id)
      .replace(/\{\{recipientName\}\}/g, r.recipientName)
      .replace(/\{\{amount\}\}/g, String(r.amount))
      .replace(/\{\{date\}\}/g, r.date)
      .replace(/\{\{description\}\}/g, r.description)

  const downloadReceipt = (r: ReceiptRecord) => {
    const tmpl =
      templates.find(
        (t) =>
          (r.type === 'donation' && t.id === 'tmpl-donation') ||
          (r.type === 'membership' && t.id === 'tmpl-membership') ||
          (r.type === 'event' && t.id === 'tmpl-event'),
      ) ?? templates[0]
    const html = renderTemplate(tmpl?.body ?? '', r)
    // Mock "PDF" — a text file containing the rendered HTML.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${r.id}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Mock PDF generated for ${r.id}.`)
  }

  const issueReceipt = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (
      !issueForm.recipientName.trim() ||
      !issueForm.recipientEmail.trim() ||
      !issueForm.description.trim() ||
      issueForm.amount <= 0
    ) {
      toast.error('All fields are required and amount must be positive.')
      return
    }
    const newReceipt = await createReceipt({
      recipientName: issueForm.recipientName.trim(),
      recipientEmail: issueForm.recipientEmail.trim(),
      amount: issueForm.amount,
      type: issueForm.type,
      description: issueForm.description.trim(),
      templateId: issueForm.templateId,
    })
    toast.success(`Receipt ${newReceipt.id} issued.`)
    setIssueOpen(false)
    setIssueForm({
      recipientName: '',
      recipientEmail: '',
      amount: 0,
      description: '',
      type: 'donation',
      templateId: 'tmpl-donation',
    })
  }

  const saveTemplate = async () => {
    if (!activeTemplate) return
    try {
      await saveTemplateToDb({ name: activeTemplate.name, body: templateDraft })
      toast.success(`Template "${activeTemplate.name}" saved.`)
    } catch (err) {
      toast.error((err as Error).message)
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
          value={`€${totals.euro.toLocaleString()}`}
          icon={<FileText size={24} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Donations"
          value={String(totals.donation)}
          icon={<ReceiptIcon size={24} weight="duotone" />}
          accent="amber"
        />
        <KpiCard
          label="Memberships"
          value={String(totals.membership)}
          icon={<ReceiptIcon size={24} weight="duotone" />}
          accent="blue"
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
            description="Search, issue and download receipts. PDF generation is mocked."
            actions={
              canWrite && (
                <Button
                  onClick={() => setIssueOpen(true)}
                  className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
                >
                  <Plus className="mr-2" weight="bold" /> Issue receipt
                </Button>
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
                  placeholder="Search by receipt ID, name, email, description…"
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
                <SelectTrigger className="md:w-56">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                title="No receipts found"
                description="Adjust your filters or issue a new receipt."
              />
            ) : (
              <>
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Receipt ID</Th>
                      <Th>Recipient</Th>
                      <Th>Type</Th>
                      <Th>Description</Th>
                      <Th>Date</Th>
                      <Th>Amount</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <Td className="font-mono text-xs">{r.id}</Td>
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
                        <Td className="text-slate-700 max-w-xs truncate">{r.description}</Td>
                        <Td>{r.date}</Td>
                        <Td className="font-semibold text-emerald-700">
                          €{r.amount.toLocaleString()}
                        </Td>
                        <Td className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReceipt(r)}
                            className="text-indigo-700 hover:bg-indigo-50"
                          >
                            <DownloadSimple size={16} className="mr-1" /> PDF
                          </Button>
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
            description="Edit the HTML used to render receipt PDFs. Supports {{receiptId}}, {{recipientName}}, {{amount}}, {{date}}, {{description}}."
            actions={
              canWrite && (
                <Button
                  onClick={saveTemplate}
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

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptIcon weight="duotone" size={24} className="text-orange-600" />
              Issue receipt
            </DialogTitle>
            <DialogDescription>
              Generates a mock PDF and queues an email to the recipient.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={issueReceipt} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Recipient name</Label>
              <Input
                value={issueForm.recipientName}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, recipientName: e.target.value })
                }
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Recipient email</Label>
              <Input
                type="email"
                value={issueForm.recipientEmail}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, recipientEmail: e.target.value })
                }
                className="mt-1.5"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Amount (EUR)</Label>
                <Input
                  type="number"
                  min={1}
                  value={issueForm.amount || ''}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, amount: Number(e.target.value) })
                  }
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Type</Label>
                <Select
                  value={issueForm.type}
                  onValueChange={(v) =>
                    setIssueForm({
                      ...issueForm,
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
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                value={issueForm.description}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, description: e.target.value })
                }
                rows={2}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Template</Label>
              <Select
                value={issueForm.templateId}
                onValueChange={(v) => setIssueForm({ ...issueForm, templateId: v })}
              >
                <SelectTrigger className="mt-1.5">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
              >
                <PaperPlaneTilt className="mr-2" weight="bold" />
                Issue & email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
