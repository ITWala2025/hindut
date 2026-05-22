import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MagnifyingGlass,
  Users,
  DownloadSimple,
  Envelope,
  Phone,
  IdentificationCard,
  Crown,
  Plus,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { SectionCard, EmptyState, KpiCard } from '@/components/admin/adminUi'
import { useMembership } from '@/hooks/useMembership'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface MemberRow {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  member_code: string | null
  joined_at: string | null
  user_id: string | null
}

interface MemberWithStats extends MemberRow {
  membershipsCount: number
  hasActive: boolean
  latestPlan: string | null
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return d.slice(0, 10)
  }
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function MembersDirectorySection() {
  const { can } = useAuth()
  const { memberships } = useMembership()
  const canRead = can('members:view') || can('members:create') || can('members:update')
  const canCreate = can('members:create')
  const canUpdate = can('members:update')
  const canDelete = can('members:delete')

  const [rows, setRows] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<MemberRow | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('members')
      .select('id, full_name, email, phone, address, member_code, joined_at, user_id')
      .order('joined_at', { ascending: false })
    if (err) {
      setError(err.message)
      setRows([])
    } else {
      setRows((data ?? []) as MemberRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (canRead) void fetchMembers()
  }, [canRead, fetchMembers])

  // Join with memberships in memory to compute per-person stats.
  const peopleWithStats = useMemo<MemberWithStats[]>(() => {
    const byCode = new Map<string, { count: number; active: boolean; latestPlan: string | null; latestStart: string }>()
    const byNameEmail = new Map<string, { count: number; active: boolean; latestPlan: string | null; latestStart: string }>()
    for (const m of memberships) {
      const key = m.memberCode ?? `${m.fullName.toLowerCase()}|${m.email.toLowerCase()}`
      const bucket = m.memberCode ? byCode : byNameEmail
      const prev = bucket.get(key) ?? { count: 0, active: false, latestPlan: null, latestStart: '' }
      const isActive = m.status === 'active'
      const isNewer = !prev.latestStart || (m.startDate > prev.latestStart)
      bucket.set(key, {
        count: prev.count + 1,
        active: prev.active || isActive,
        latestPlan: isNewer ? m.planId : prev.latestPlan,
        latestStart: isNewer ? m.startDate : prev.latestStart,
      })
    }
    return rows.map((r) => {
      const codeStats = r.member_code ? byCode.get(r.member_code) : undefined
      const fallback = byNameEmail.get(`${r.full_name.toLowerCase()}|${(r.email ?? '').toLowerCase()}`)
      const stats = codeStats ?? fallback
      return {
        ...r,
        membershipsCount: stats?.count ?? 0,
        hasActive: stats?.active ?? false,
        latestPlan: stats?.latestPlan ?? null,
      }
    })
  }, [rows, memberships])

  const filtered = useMemo(() => {
    if (!search.trim()) return peopleWithStats
    const q = search.toLowerCase()
    return peopleWithStats.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.member_code ?? '').toLowerCase().includes(q),
    )
  }, [peopleWithStats, search])

  const totals = useMemo(() => {
    const total = peopleWithStats.length
    const withMembership = peopleWithStats.filter((p) => p.membershipsCount > 0).length
    const activeMembers = peopleWithStats.filter((p) => p.hasActive).length
    const noMembership = total - withMembership
    return { total, withMembership, activeMembers, noMembership }
  }, [peopleWithStats])

  const exportCsv = () => {
    const headers = ['member_code', 'full_name', 'email', 'phone', 'address', 'joined_at', 'memberships', 'has_active', 'latest_plan']
    const lines = [headers.join(',')]
    for (const p of filtered) {
      lines.push([
        p.member_code ?? '',
        p.full_name,
        p.email ?? '',
        p.phone ?? '',
        p.address ?? '',
        p.joined_at ?? '',
        p.membershipsCount,
        p.hasActive ? 'yes' : 'no',
        p.latestPlan ?? '',
      ].map(csvEscape).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} member${filtered.length === 1 ? '' : 's'}`)
  }

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormAddress('')
  }

  const openCreate = () => {
    setEditingId(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (m: MemberRow) => {
    setEditingId(m.id)
    setFormName(m.full_name)
    setFormEmail(m.email ?? '')
    setFormPhone(m.phone ?? '')
    setFormAddress(m.address ?? '')
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setTimeout(() => {
      setEditingId(null)
      resetForm()
    }, 200)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Full name is required')
      return
    }
    const emailTrim = formEmail.trim()
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      toast.error('Please enter a valid email')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: formName.trim(),
        email:     emailTrim || null,
        phone:     formPhone.trim() || null,
        address:   formAddress.trim() || null,
      }
      if (editingId) {
        const { error: err } = await supabase
          .from('members')
          .update(payload)
          .eq('id', editingId)
        if (err) throw new Error(err.message)
        toast.success('Person updated')
      } else {
        const { error: err } = await supabase
          .from('members')
          .insert({ ...payload, user_id: null })
        if (err) throw new Error(err.message)
        toast.success('Person added')
      }
      closeDialog()
      await fetchMembers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      const { error: err } = await supabase
        .from('members')
        .delete()
        .eq('id', confirmDelete.id)
      if (err) throw new Error(err.message)
      toast.success(`Removed ${confirmDelete.full_name}`)
      setConfirmDelete(null)
      await fetchMembers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (!canRead) {
    return (
      <SectionCard title="People">
        <EmptyState title="No access" description="You don't have permission to view the member directory." />
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total people" value={String(totals.total)} icon={<Users size={20} />} />
        <KpiCard label="With memberships" value={String(totals.withMembership)} icon={<IdentificationCard size={20} />} />
        <KpiCard label="Currently active" value={String(totals.activeMembers)} icon={<Crown size={20} />} />
        <KpiCard label="No membership" value={String(totals.noMembership)} icon={<Envelope size={20} />} />
      </div>

      <SectionCard
        title="People"
        description="Everyone in the members table. Most are added automatically when someone joins a membership. Use Add person to manually create records (e.g. for offline cash payments or imports)."
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <Button onClick={openCreate} className="gap-2">
                <Plus size={16} weight="bold" /> Add person
              </Button>
            )}
            <Button variant="outline" onClick={exportCsv} className="gap-2" disabled={filtered.length === 0}>
              <DownloadSimple size={16} /> Export CSV
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, phone or member code…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs text-slate-500">
            {loading ? 'Loading…' : `${filtered.length} of ${peopleWithStats.length}`}
          </div>
        </div>

        {error ? (
          <EmptyState title="Could not load members" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No matching people' : 'No members yet'}
            description={search ? 'Try a different search term.' : 'People are created automatically when someone joins, donates, or books a ticket.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Member code</th>
                  <th className="py-2 pr-3 font-medium">Contact</th>
                  <th className="py-2 pr-3 font-medium">Memberships</th>
                  <th className="py-2 pr-3 font-medium">Latest plan</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-800">{p.full_name}</div>
                      {p.user_id && (
                        <div className="text-[10px] uppercase tracking-wide text-emerald-600">Has account</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-slate-600">
                      {p.member_code ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {p.email && (
                        <div className="flex items-center gap-1 text-xs">
                          <Envelope size={12} /> {p.email}
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone size={12} /> {p.phone}
                        </div>
                      )}
                      {!p.email && !p.phone && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.membershipsCount}</span>
                        {p.hasActive && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-slate-600 capitalize">
                      {p.latestPlan ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-slate-500 text-xs">{fmtDate(p.joined_at)}</td>
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
                            disabled={p.membershipsCount > 0}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit person' : 'Add person'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update this person’s contact details.'
                : 'Manually add someone to the members directory. A member_code will be assigned when they pay for a membership.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="person-name">Full name *</Label>
              <Input
                id="person-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="person-email">Email</Label>
              <Input
                id="person-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="person-phone">Phone</Label>
              <Input
                id="person-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+353 ..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="person-address">Address</Label>
              <Textarea
                id="person-address"
                rows={2}
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add person'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete person?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-medium">{confirmDelete?.full_name}</span> from the members
              table. Their auth login (if any) is not affected. This action cannot be undone.
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
