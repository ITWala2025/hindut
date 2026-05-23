import { useEffect, useMemo, useState } from 'react'
import { Lock, ShieldCheck, FloppyDisk, ArrowCounterClockwise, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import {
  ACTIONS,
  ACTION_LABELS,
  ADMIN_MODULES,
  MODULE_LABELS,
  ROLE_LABELS,
  useAuth,
  type ActionId,
  type AdminModule,
  type AdminRole,
  type RolePermissionMap,
} from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const ROLE_PERMISSIONS_URL = '/.netlify/functions/role-permissions'

/**
 * Roles & Permissions — super-admin-only matrix UI.
 *
 * Renders one tab per configurable role (`admin`, `editor`) with a row per
 * module and a column per CRUD action. Toggling a switch changes only the
 * local draft; clicking "Save changes" writes the entire `permissions`
 * blob via `public.set_role_permissions(role, jsonb)` which is RLS-guarded
 * to super_admin in the DB.
 *
 * super_admin itself is not editable — it always has every permission. The
 * page renders an info card for it instead of a matrix.
 */
const EDITABLE_ROLES: AdminRole[] = ['admin', 'editor']

export function RolesSection() {
  const { isSuperAdmin, rolePermissions, refreshPermissions } = useAuth()

  // Local draft per role so toggles feel instant and a Save commits all of them.
  const [drafts, setDrafts] = useState<Record<AdminRole, RolePermissionMap>>({
    super_admin: rolePermissions.super_admin,
    admin:       rolePermissions.admin,
    editor:      rolePermissions.editor,
  })
  const [saving, setSaving] = useState<AdminRole | null>(null)
  const [activeRole, setActiveRole] = useState<AdminRole>('admin')

  // Re-sync drafts whenever the upstream map changes (e.g. on refresh / by
  // another tab updating it). We never overwrite a role currently being saved.
  useEffect(() => {
    setDrafts((prev) => ({
      super_admin: rolePermissions.super_admin,
      admin:  saving === 'admin'  ? prev.admin  : rolePermissions.admin,
      editor: saving === 'editor' ? prev.editor : rolePermissions.editor,
    }))
  }, [rolePermissions, saving])

  if (!isSuperAdmin) {
    return (
      <SectionCard
        title="Roles & permissions"
        description="Only Super Admins can edit role-based access."
      >
        <EmptyState
          title="Forbidden"
          description="This page is restricted to Super Admins."
        />
      </SectionCard>
    )
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Roles & permissions"
        description="Grant or revoke CRUD permissions per module. Changes apply immediately for every user holding that role on their next page load."
      >
        <SuperAdminCallout />

        {/* Role tabs */}
        <div className="mt-6 mb-4 inline-flex rounded-xl bg-slate-100 p-1">
          {EDITABLE_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRole(r)}
              className={
                activeRole === r
                  ? 'rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-orange-700 shadow-sm'
                  : 'rounded-lg px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900'
              }
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        <RoleMatrix
          role={activeRole}
          draft={drafts[activeRole]}
          saving={saving === activeRole}
          isDirty={!sameMap(drafts[activeRole], rolePermissions[activeRole])}
          onToggle={(mod, action, value) =>
            setDrafts((d) => ({
              ...d,
              [activeRole]: {
                ...d[activeRole],
                [mod]: { ...d[activeRole][mod], [action]: value },
              },
            }))
          }
          onReset={() =>
            setDrafts((d) => ({ ...d, [activeRole]: rolePermissions[activeRole] }))
          }
          onSave={async () => {
            setSaving(activeRole)
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const res = await fetch(ROLE_PERMISSIONS_URL, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session?.access_token ?? ''}`,
                },
                body: JSON.stringify({
                  target_role:     activeRole,
                  new_permissions: drafts[activeRole],
                }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error ?? 'Failed to save permissions.')
              toast.success(`Saved permissions for ${ROLE_LABELS[activeRole]}.`)
              await refreshPermissions()
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Failed to save permissions.'
              toast.error(message)
            } finally {
              setSaving(null)
            }
          }}
        />
      </SectionCard>
    </div>
  )
}

function SuperAdminCallout() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/70 p-4">
      <ShieldCheck size={22} weight="duotone" className="text-orange-700 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-orange-900">
          {ROLE_LABELS.super_admin}
        </p>
        <p className="text-orange-900/80 mt-0.5">
          Super Admins always have every permission and can manage all users —
          including granting or revoking Super Admin status. They are not shown
          in the matrix below because their access cannot be reduced.
        </p>
      </div>
    </div>
  )
}

interface RoleMatrixProps {
  role:     AdminRole
  draft:    RolePermissionMap
  saving:   boolean
  isDirty:  boolean
  onToggle: (module: AdminModule, action: ActionId, value: boolean) => void
  onSave:   () => void
  onReset:  () => void
}

function RoleMatrix({ role, draft, saving, isDirty, onToggle, onSave, onReset }: RoleMatrixProps) {
  const summary = useMemo(() => {
    let granted = 0
    let total   = 0
    for (const m of ADMIN_MODULES) {
      for (const a of ACTIONS) {
        total += 1
        if (draft[m]?.[a]) granted += 1
      }
    }
    return { granted, total }
  }, [draft])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock size={18} weight="duotone" className="text-slate-500" />
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{ROLE_LABELS[role]}</span>{' '}
            has <span className="font-semibold">{summary.granted}</span> of{' '}
            {summary.total} permissions enabled.
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!isDirty || saving}
            className="border-slate-300"
          >
            <ArrowCounterClockwise size={14} className="mr-1.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!isDirty || saving}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            <FloppyDisk size={14} className="mr-1.5" weight="bold" />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <DataTable>
          <thead>
            <tr>
              <Th>Module</Th>
              {ACTIONS.map((a) => (
                <Th key={a} className="text-center w-28">
                  {ACTION_LABELS[a]}
                </Th>
              ))}
              <Th className="text-right pr-4 w-32">Summary</Th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_MODULES.map((mod) => {
              const moduleDraft = draft[mod]
              const grantedHere = ACTIONS.filter((a) => moduleDraft?.[a]).length
              const totalHere   = ACTIONS.length
              const denied      = grantedHere === 0
              return (
                <tr key={mod} className="border-t border-slate-100">
                  <Td>
                    <div className="font-semibold text-slate-900">
                      {MODULE_LABELS[mod]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mod}
                    </div>
                  </Td>
                  {ACTIONS.map((a) => (
                    <Td key={a} className="text-center">
                      <Switch
                        checked={!!moduleDraft?.[a]}
                        disabled={saving}
                        onCheckedChange={(v) => onToggle(mod, a, v)}
                        aria-label={`${MODULE_LABELS[mod]} – ${ACTION_LABELS[a]}`}
                      />
                    </Td>
                  ))}
                  <Td className="text-right pr-4">
                    {denied ? (
                      <Badge variant="outline" className="border-slate-300 text-slate-500">
                        No access
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        {grantedHere}/{totalHere}
                      </Badge>
                    )}
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      </div>

      {isDirty && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Warning size={18} weight="duotone" className="text-amber-700 mt-0.5" />
          <span>
            You have unsaved changes. They will not apply until you click{' '}
            <span className="font-semibold">Save changes</span>.
          </span>
        </div>
      )}
    </div>
  )
}

function sameMap(a: RolePermissionMap, b: RolePermissionMap): boolean {
  for (const m of ADMIN_MODULES) {
    for (const action of ACTIONS) {
      if (!!a[m]?.[action] !== !!b[m]?.[action]) return false
    }
  }
  return true
}
