import { useEffect, useState } from 'react'
import { Plus, UserCircle, ShieldCheck, Trash, PaperPlaneTilt } from '@phosphor-icons/react'
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
import { toast } from 'sonner'
import { SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { ROLE_LABELS, useAuth, type AdminRole, type AdminUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface DisplayUser extends AdminUser {
  invitedBy?: string
  lastActive?: string
}

export function UsersSection() {
  const { user, can, isSuperAdmin } = useAuth()
  const canCreate = can('users:create')
  const canUpdate = can('users:update')
  const canDelete = can('users:delete')

  const [users, setUsers] = useState<DisplayUser[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ name: string; email: string; role: AdminRole }>({
    name: '',
    email: '',
    role: 'editor',
  })

  const reload = () => {
    supabase.rpc('list_admin_users').then(({ data, error }) => {
      if (!error && data) {
        const rows = data as Array<{ id: string; email: string; full_name: string | null; role: string }>
        setUsers(rows.map((r) => ({
          id: r.id,
          name: r.full_name ?? r.email.split('@')[0],
          email: r.email,
          role: r.role as AdminRole,
          avatarColor: 'from-slate-400 to-slate-600',
          lastActive: 'N/A',
        })))
      }
    })
  }

  useEffect(() => {
    reload()
  }, [])

  const invite = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required.')
      return
    }
    if (users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      toast.error('A user with that email already exists.')
      return
    }
    const newUser: DisplayUser = {
      id: `u-${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      avatarColor: 'from-slate-400 to-slate-600',
      invitedBy: user?.email,
      lastActive: 'Pending',
    }
    setUsers((prev) => [...prev, newUser])
    toast.success(`Invite sent to ${form.email}.`)
    setOpen(false)
    setForm({ name: '', email: '', role: 'editor' })
  }

  const changeRole = async (id: string, role: AdminRole) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admins can change user roles.')
      return
    }
    const { error } = await supabase.rpc('set_user_role', {
      target_user_id: id,
      new_role: role,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Role updated.')
    reload()
  }

  const removeUser = (id: string) => {
    if (id === user?.id) {
      toast.error("You can't remove your own account.")
      return
    }
    setUsers((prev) => prev.filter((u) => u.id !== id))
    toast.success('User removed.')
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Team & access"
        description="Manage who can sign in to the admin portal and their permissions."
        actions={
          canCreate && (
            <Button
              onClick={() => setOpen(true)}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
            >
              <Plus className="mr-2" weight="bold" />
              Invite user
            </Button>
          )
        }
      >
        {!canCreate && !canUpdate && !canDelete && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You're viewing this page in read-only mode. Ask a Super Admin to
            grant you additional permissions.
          </div>
        )}

        {users.length === 0 ? (
          <EmptyState title="No team members yet" />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Invited by</Th>
                <Th>Last active</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full bg-linear-to-br ${u.avatarColor} text-white font-semibold flex items-center justify-center text-xs`}
                      >
                        {u.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {u.name}
                          {u.id === user?.id && (
                            <Badge className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-100">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {isSuperAdmin && u.id !== user?.id ? (
                      <Select
                        value={u.role}
                        onValueChange={(v) => changeRole(u.id, v as AdminRole)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
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
                    ) : (
                      <Badge
                        className={
                          u.role === 'super_admin'
                            ? 'bg-rose-600 text-white'
                            : u.role === 'admin'
                            ? 'bg-orange-600 text-white'
                            : 'bg-amber-500 text-white'
                        }
                      >
                        <ShieldCheck className="mr-1" size={12} weight="fill" />
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-xs text-muted-foreground">{u.invitedBy ?? '—'}</Td>
                  <Td className="text-xs">{u.lastActive ?? '—'}</Td>
                  <Td className="text-right">
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUser(u.id)}
                        disabled={u.id === user?.id}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle weight="duotone" size={24} className="text-orange-600" />
              Invite user
            </DialogTitle>
            <DialogDescription>
              They'll receive a mock email invitation to join the admin portal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Anjali Verma"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@hindut.ie"
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
              >
                <PaperPlaneTilt className="mr-2" weight="bold" />
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
