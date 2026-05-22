import { useMemo, useState } from 'react'
import {
  Plus,
  PencilSimple,
  Trash,
  Star,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { SectionCard, EmptyState } from '@/components/admin/adminUi'

import { useMembership, type PlanInput } from '@/hooks/useMembership'
import { useAuth } from '@/lib/auth'
import type {
  MembershipPlan,
  PlanCadence,
  PlanCategory,
} from '@/data/membership'

const ICON_CHOICES = [
  'Flame',
  'Leaf',
  'Crown',
  'HandCoins',
  'Star',
  'Heart',
  'Sparkle',
]

const CADENCE_CHOICES: { value: PlanCadence; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semi_annual', label: 'Semi-annual' },
  { value: 'annual', label: 'Annual' },
]

const CATEGORY_CHOICES: { value: PlanCategory; label: string }[] = [
  { value: 'membership', label: 'Membership' },
  { value: 'giving', label: 'Monthly giving' },
]

const EMPTY_INPUT: PlanInput = {
  id: '',
  name: '',
  durationLabel: 'year',
  durationMonths: 12,
  price: 0,
  description: '',
  benefits: [],
  popular: false,
  sortOrder: 0,
  cadence: 'annual',
  category: 'membership',
  subtitle: '',
  icon: '',
  gradient: '',
  bgGradient: '',
  borderColor: '',
  active: true,
}

function planToInput(p: MembershipPlan): PlanInput {
  return {
    id: p.id,
    name: p.name,
    durationLabel: p.durationLabel,
    durationMonths: p.durationMonths,
    price: p.price,
    description: p.description,
    benefits: p.benefits,
    popular: !!p.popular,
    sortOrder: p.sortOrder,
    cadence: p.cadence,
    category: p.category,
    subtitle: p.subtitle ?? '',
    icon: p.icon ?? '',
    gradient: p.gradient ?? '',
    bgGradient: p.bgGradient ?? '',
    borderColor: p.borderColor ?? '',
    active: p.active,
  }
}

export function MembershipPlansSection() {
  const { can } = useAuth()
  const { plans, createPlan, updatePlan, deletePlan } = useMembership()
  const canCreate = can('members:create')
  const canUpdate = can('members:update')
  const canDelete = can('members:delete')

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [plans],
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanInput>(EMPTY_INPUT)
  const [benefitsText, setBenefitsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<MembershipPlan | null>(null)

  const isEdit = editingId !== null

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_INPUT)
    setBenefitsText('')
    setDialogOpen(true)
  }

  const openEdit = (p: MembershipPlan) => {
    setEditingId(p.id)
    const input = planToInput(p)
    setForm(input)
    setBenefitsText(input.benefits.join('\n'))
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setTimeout(() => {
      setEditingId(null)
      setForm(EMPTY_INPUT)
      setBenefitsText('')
    }, 200)
  }

  const handleSave = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      toast.error('Plan id and name are required')
      return
    }
    const benefits = benefitsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const payload: PlanInput = { ...form, benefits }
    setSaving(true)
    try {
      if (isEdit) {
        await updatePlan(editingId!, payload)
        toast.success('Plan updated')
      } else {
        await createPlan(payload)
        toast.success('Plan created')
      }
      closeDialog()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deletePlan(confirmDelete.id)
      toast.success(`Plan "${confirmDelete.name}" deleted`)
      setConfirmDelete(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plan')
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Membership Plans"
        description="Manage plans shown on the public /membership page. Includes annual membership and monthly giving tiers."
        actions={
          canCreate ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus size={16} weight="bold" /> New plan
            </Button>
          ) : undefined
        }
      >
        {sortedPlans.length === 0 ? (
          <EmptyState
            title="No plans yet"
            description="Create your first plan to display options on the public membership page."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Cadence</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Sort</th>
                  <th className="py-2 pr-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{p.name}</span>
                        {p.popular && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Star size={10} weight="fill" /> Popular
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{p.id}</div>
                    </td>
                    <td className="py-2 pr-3 capitalize">{p.category}</td>
                    <td className="py-2 pr-3 capitalize">{p.cadence.replace('_', '-')}</td>
                    <td className="py-2 pr-3">€{p.price}</td>
                    <td className="py-2 pr-3">
                      {p.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{p.sortOrder}</td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(p)}
                            title="Edit"
                          >
                            <PencilSimple size={14} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setConfirmDelete(p)}
                            title="Delete"
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit plan' : 'New plan'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update plan details. The id cannot be changed.'
                : 'Create a new membership or monthly giving plan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-id">Plan id</Label>
              <Input
                id="plan-id"
                placeholder="e.g. annual, shraddha"
                value={form.id}
                disabled={isEdit}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.trim() }))}
              />
              <p className="text-xs text-slate-400">Lowercase, no spaces. Used internally.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as PlanCategory }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_CHOICES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cadence</Label>
              <Select
                value={form.cadence}
                onValueChange={(v) => setForm((f) => ({ ...f, cadence: v as PlanCadence }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CADENCE_CHOICES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Price (€)</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-sort">Sort order</Label>
              <Input
                id="plan-sort"
                type="number"
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-duration-label">Duration label</Label>
              <Input
                id="plan-duration-label"
                placeholder="year / month / 6 months"
                value={form.durationLabel}
                onChange={(e) => setForm((f) => ({ ...f, durationLabel: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-duration-months">Duration (months)</Label>
              <Input
                id="plan-duration-months"
                type="number"
                min={1}
                value={form.durationMonths}
                onChange={(e) => setForm((f) => ({ ...f, durationMonths: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-subtitle">Subtitle</Label>
              <Input
                id="plan-subtitle"
                placeholder="e.g. Faith, Service, Devotion"
                value={form.subtitle ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-benefits">Benefits (one per line)</Label>
              <Textarea
                id="plan-benefits"
                rows={4}
                placeholder="Monthly Nama-Nakshatra Archana&#10;Community newsletter"
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select
                value={form.icon || '__none__'}
                onValueChange={(v) => setForm((f) => ({ ...f, icon: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(none)</SelectItem>
                  {ICON_CHOICES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-gradient">Icon gradient (Tailwind)</Label>
              <Input
                id="plan-gradient"
                placeholder="from-orange-500 to-amber-500"
                value={form.gradient ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, gradient: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-bg">Card background gradient</Label>
              <Input
                id="plan-bg"
                placeholder="from-orange-50 to-amber-50"
                value={form.bgGradient ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bgGradient: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-border">Border color class</Label>
              <Input
                id="plan-border"
                placeholder="border-orange-200"
                value={form.borderColor ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, borderColor: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between sm:col-span-2 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="plan-popular"
                  checked={!!form.popular}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, popular: v }))}
                />
                <Label htmlFor="plan-popular">Mark as Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="plan-active"
                  checked={form.active ?? true}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                />
                <Label htmlFor="plan-active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium">{confirmDelete?.name}</span> ({confirmDelete?.id}).
              Existing memberships using this plan will keep the plan id but won't be able to
              renew. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
