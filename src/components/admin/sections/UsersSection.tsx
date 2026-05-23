import { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  UserCircle,
  ShieldCheck,
  Trash,
  PaperPlaneTilt,
  Clock,
  Warning,
  ArrowClockwise,
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
import { SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { ROLE_LABELS, useAuth, type AdminRole } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthUser {
  id:           string
  email:        string
  full_name:    string
  role:         AdminRole | null
  pending_role: AdminRole | null
  status:       'active' | 'pending' | 'unassigned'
  invited_by:   string | null
  created_at:   string
  last_sign_in: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  'from-orange-400 to-amber-500',
  'from-violet-400 to-purple-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-500',
  'from-slate-400 to-slate-600',
]

function avatarColor(userId: string): string {
  let hash = 0
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string, email: string): string {
  const src = name.trim() || email.split('@')[0]
  return src
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function UsersSection() {
  const { user, can, isSuperAdmin } = useAuth()
  const canCreate = can('users:create')
  const canUpdate = can('users:update')
  const canDelete = can('users:delete')

  const [users,        setUsers]        = useState<AuthUser[]>([])
  const [loading,      setLoading]      = useState(true)
  const [open,         setOpen]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null)
  const [noSmtpUrl,    setNoSmtpUrl]    = useState<string | null>(null)

  const [form, setForm] = useState<{ name: string; email: string; role: AdminRole }>({
    name:  '',
    email: '',
    role:  'editor',
  })
  const [inviting, setInviting] = useState(false)

  // -------------------------------------------------------------------------
  // Load users from backend
  // -------------------------------------------------------------------------
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token   = session.data.session?.access_token
      if (!token) { toast.error('Not authenticated.'); return }

      const res  = await fetch('/.netlify/functions/admin-users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to load users.'); return }
      setUsers(data as AuthUser[])
    } catch {
      toast.error('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // -------------------------------------------------------------------------
  // Invite new user
  // -------------------------------------------------------------------------
  const invite = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.email.trim()) { toast.error('Email is required.'); return }
    if (users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      toast.error('A user with that email already exists.')
      return
    }

    setInviting(true)
    try {
      const session = await supabase.auth.getSession()
      const token   = session.data.session?.access_token
      const res = await fetch('/.netlify/functions/admin-users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ kind: 'invite', email: form.email.trim(), name: form.name.trim(), role: form.role }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Invite failed.'); return }
      toast.success(`Invite sent to ${form.email.trim()}. They'll receive an email to activate their account.`)
      setOpen(false)
      setForm({ name: '', email: '', role: 'editor' })
      await reload()
    } catch {
      toast.error('Failed to send invite.')
    } finally {
      setInviting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Assign role to existing user (sends verification email)
  // -------------------------------------------------------------------------
  const assignRole = async (u: AuthUser, role: AdminRole) => {
    if (!isSuperAdmin) { toast.error('Only Super Admins can change user roles.'); return }
    try {
      const session = await supabase.auth.getSession()
      const token   = session.data.session?.access_token
      const res = await fetch('/.netlify/functions/admin-users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ kind: 'assign-role', userId: u.id, email: u.email, role }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Role assignment failed.'); return }
      if (data.warning && data.activationUrl) {
        // SMTP not configured — show the activation URL so the admin can share it manually
        setNoSmtpUrl(data.activationUrl)
      } else {
        toast.success(`Verification email sent to ${u.email}. Role activates when they click the link.`)
      }
      await reload()
    } catch {
      toast.error('Failed to assign role.')
    }
  }

  // -------------------------------------------------------------------------
  // Remove user
  // -------------------------------------------------------------------------
  const removeUser = async (u: AuthUser) => {
    if (u.id === user?.id) { toast.error("You can't remove your own account."); return }
    try {
      const session = await supabase.auth.getSession()
      const token   = session.data.session?.access_token
      const res = await fetch(`/.netlify/functions/admin-users?userId=${encodeURIComponent(u.id)}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Delete failed.'); return }
      toast.success(`${u.full_name || u.email} has been removed.`)
      setDeleteTarget(null)
      await reload()
    } catch {
      toast.error('Failed to remove user.')
    }
  }

  // -------------------------------------------------------------------------
  // Status badge
  // -------------------------------------------------------------------------
  function StatusBadge({ u }: { u: AuthUser }) {
    if (u.status === 'active') {
      const cls =
        u.role === 'super_admin' ? 'bg-rose-600 text-white'
        : u.role === 'admin'     ? 'bg-orange-600 text-white'
        : 'bg-amber-500 text-white'
      return (
        <Badge className={cls}>
          <ShieldCheck className="mr-1" size={12} weight="fill" />
          {ROLE_LABELS[u.role!]}
        </Badge>
      )
    }
    if (u.status === 'pending') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Clock className="mr-1" size={12} weight="bold" />
          Pending ({u.pending_role ? ROLE_LABELS[u.pending_role as AdminRole] : '—'})
        </Badge>
      )
    }
    return (
      <Badge className="bg-slate-100 text-slate-500 border-slate-200">
        <Warning className="mr-1" size={12} weight="bold" />
        No role
      </Badge>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <SectionCard
        title="Team & access"
        description="All Supabase Auth users. Assign roles to grant admin portal access."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reload} title="Refresh">
              <ArrowClockwise size={16} weight="bold" />
            </Button>
            {canCreate && (
              <Button
                onClick={() => setOpen(true)}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <Plus className="mr-2" weight="bold" />
                Invite user
              </Button>
            )}
          </div>
        }
      >
        {!canCreate && !canUpdate && !canDelete && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You're viewing this page in read-only mode. Ask a Super Admin to grant you additional permissions.
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading users…</div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Role / Status</Th>
                <Th>Invited by</Th>
                <Th>Last sign-in</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full bg-linear-to-br ${avatarColor(u.id)} text-white font-semibold flex items-center justify-center text-xs shrink-0`}
                      >
                        {initials(u.full_name, u.email)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {u.full_name || u.email.split('@')[0]}
                          {u.id === user?.id && (
                            <Badge className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-100">You</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </Td>

                  <Td>
                    {isSuperAdmin && u.id !== user?.id && u.status !== 'pending' ? (
                      <Select
                        value={u.role ?? '__none__'}
                        onValueChange={(v) => v !== '__none__' && assignRole(u, v as AdminRole)}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue placeholder="Assign role…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>Assign role…</SelectItem>
                          {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge u={u} />
                    )}
                  </Td>

                  <Td className="text-xs text-muted-foreground">{u.invited_by ?? '—'}</Td>
                  <Td className="text-xs text-muted-foreground">{fmtDate(u.last_sign_in)}</Td>

                  <Td className="text-right">
                    {canDelete && u.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(u)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash size={16} className="mr-1" /> Remove
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {/* ---- Invite dialog ---- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle weight="duotone" size={24} className="text-orange-600" />
              Invite user
            </DialogTitle>
            <DialogDescription>
              They'll receive a Supabase invite email. After accepting they'll click a verification
              link to activate their assigned role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Full name <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Anjali Verma"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@hindutemple.ie"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as AdminRole })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={inviting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviting}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
              >
                <PaperPlaneTilt className="mr-2" weight="bold" />
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirmation ---- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> from
              Supabase Auth and revoke all their admin access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && removeUser(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- No-SMTP activation URL dialog ---- */}
      <Dialog open={!!noSmtpUrl} onOpenChange={(o) => !o && setNoSmtpUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning weight="duotone" size={22} className="text-amber-500" />
              Email not sent — copy activation link
            </DialogTitle>
            <DialogDescription>
              The role invitation was saved but the verification email could not be sent (SMTP is not configured).
              Copy the link below and share it with the user directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 break-all select-all font-mono">
              {noSmtpUrl}
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(noSmtpUrl ?? '')
                toast.success('Activation link copied to clipboard.')
              }}
            >
              Copy link
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNoSmtpUrl(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
