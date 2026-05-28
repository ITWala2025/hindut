/**
 * Authentication + RBAC layer backed by Supabase.
 *
 * Roles
 * -----
 *   - super_admin : always has every capability; cannot be downgraded by
 *                   anyone other than another super_admin.
 *   - admin       : capabilities controlled by `public.role_permissions`.
 *   - editor      : capabilities controlled by `public.role_permissions`.
 *
 * Capabilities are expressed as `<module>:<action>` strings — e.g.
 * `'events:create'`, `'media:delete'`. Older `manage*` / `viewAnalytics`
 * strings are still accepted by `can()` (mapped to the closest
 * `<module>:update` capability) so existing call-sites keep working.
 *
 * On sign-in the provider:
 *   1. Loads the row from `user_roles` for the current user (raw role).
 *   2. Loads every row from `role_permissions` (full map).
 *   3. Builds the effective permission map.
 * The map is re-fetched whenever Supabase emits a SIGNED_IN / TOKEN_REFRESHED
 * event so super-admin edits propagate within one auth tick.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type AdminRole = 'super_admin' | 'admin' | 'editor'

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Administrator',
  editor:      'Editor',
}

export type AdminModule =
  | 'analytics'
  | 'members'
  | 'receipts'
  | 'events'
  | 'rsvps'
  | 'tickets'
  | 'donations'
  | 'causes'
  | 'media'
  | 'services'
  | 'users'
  | 'settings'

export const MODULE_LABELS: Record<AdminModule, string> = {
  analytics: 'Analytics',
  members:   'Membership',
  receipts:  'Receipts',
  events:    'Events',
  rsvps:     'RSVPs',
  tickets:   'Ticket Bookings',
  donations: 'Donations',
  causes:    'Special Causes',
  media:     'Media Library',
  services:  'Services',
  users:     'Team & Access',
  settings:  'Settings',
}

export const ADMIN_MODULES: AdminModule[] = [
  'analytics',
  'members',
  'receipts',
  'events',
  'rsvps',
  'tickets',
  'donations',
  'causes',
  'media',
  'services',
  'users',
  'settings',
]

export type ActionId = 'view' | 'create' | 'update' | 'delete'

export const ACTION_LABELS: Record<ActionId, string> = {
  view:   'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
}

export const ACTIONS: ActionId[] = ['view', 'create', 'update', 'delete']

export type Capability = `${AdminModule}:${ActionId}`

/** Legacy capability names still in use across older sections. */
type LegacyCapability =
  | 'manageUsers'
  | 'manageMemberships'
  | 'manageReceipts'
  | 'manageEvents'
  | 'manageMedia'
  | 'manageServices'
  | 'manageSettings'
  | 'viewAnalytics'

const LEGACY_MAP: Record<LegacyCapability, Capability> = {
  manageUsers:       'users:update',
  manageMemberships: 'members:update',
  manageReceipts:    'receipts:update',
  manageEvents:      'events:update',
  manageMedia:       'media:update',
  manageServices:    'services:update',
  manageSettings:    'settings:update',
  viewAnalytics:     'analytics:view',
}

export type ModulePermissions = Record<ActionId, boolean>
export type RolePermissionMap = Record<AdminModule, ModulePermissions>

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  avatarColor: string
}

// ---------------------------------------------------------------------------
// Defaults — used when DB hasn't loaded yet OR the role_permissions row is
// missing. super_admin is implicit "everything true" and never looked up.
// ---------------------------------------------------------------------------
function blank(): ModulePermissions {
  return { view: false, create: false, update: false, delete: false }
}

function all(): ModulePermissions {
  return { view: true, create: true, update: true, delete: true }
}

function blankMap(): RolePermissionMap {
  return ADMIN_MODULES.reduce((acc, m) => {
    acc[m] = blank()
    return acc
  }, {} as RolePermissionMap)
}

function fullMap(): RolePermissionMap {
  return ADMIN_MODULES.reduce((acc, m) => {
    acc[m] = all()
    return acc
  }, {} as RolePermissionMap)
}

export const SUPER_ADMIN_PERMISSIONS: RolePermissionMap = fullMap()

const DEFAULT_PERMISSIONS: Record<AdminRole, RolePermissionMap> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  admin: {
    ...blankMap(),
    analytics: { view: true,  create: false, update: false, delete: false },
    members:   { view: true,  create: true,  update: true,  delete: true  },
    receipts:  { view: true,  create: true,  update: true,  delete: true  },
    events:    { view: true,  create: true,  update: true,  delete: true  },
    rsvps:     { view: true,  create: false, update: true,  delete: true  },
    tickets:   { view: true,  create: false, update: true,  delete: true  },
    donations: { view: true,  create: false, update: true,  delete: true  },
    causes:    { view: true,  create: true,  update: true,  delete: true  },
    media:     { view: true,  create: true,  update: true,  delete: true  },
    services:  { view: true,  create: true,  update: true,  delete: true  },
    users:     { view: true,  create: true,  update: true,  delete: true  },
    settings:  { view: true,  create: false, update: true,  delete: false },
  },
  editor: {
    ...blankMap(),
    analytics: { view: true,  create: false, update: false, delete: false },
    events:    { view: true,  create: true,  update: true,  delete: false },
    rsvps:     { view: true,  create: false, update: false, delete: false },
    tickets:   { view: true,  create: false, update: false, delete: false },
    causes:    { view: true,  create: false, update: false, delete: false },
    media:     { view: true,  create: true,  update: true,  delete: false },
    services:  { view: true,  create: true,  update: true,  delete: false },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  'from-orange-600 to-amber-600',
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-green-600 to-teal-600',
  'from-red-600 to-orange-600',
  'from-indigo-600 to-blue-600',
]

function pickAvatarColor(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function parseCapability(input: Capability | LegacyCapability): { module: AdminModule; action: ActionId } | null {
  const raw: string = input in LEGACY_MAP ? LEGACY_MAP[input as LegacyCapability] : input
  const [m, a] = raw.split(':')
  if (!m || !a) return null
  if (!ADMIN_MODULES.includes(m as AdminModule)) return null
  if (!ACTIONS.includes(a as ActionId)) return null
  return { module: m as AdminModule, action: a as ActionId }
}

/**
 * Merge a permissions blob loaded from the DB (which may be missing modules
 * after a future schema change) into the full map of modules so callers can
 * blindly index by any module.
 */
export function normalisePermissions(input: unknown): RolePermissionMap {
  const base = blankMap()
  if (!input || typeof input !== 'object') return base
  for (const mod of ADMIN_MODULES) {
    const incoming = (input as Record<string, unknown>)[mod]
    if (!incoming || typeof incoming !== 'object') continue
    const src = incoming as Record<string, unknown>
    base[mod] = {
      view:   !!src.view,
      create: !!src.create,
      update: !!src.update,
      delete: !!src.delete,
    }
  }
  return base
}

// ---------------------------------------------------------------------------
// Session bootstrap
// ---------------------------------------------------------------------------
async function fetchAdminUser(session: Session): Promise<AdminUser | null> {
  // Prefer the role stored in public.user_roles (the source of truth);
  // fall back to app_metadata.role for legacy compatibility.
  let role: AdminRole | null = null
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (data?.role && (data.role === 'super_admin' || data.role === 'admin' || data.role === 'editor')) {
      role = data.role
    }
  } catch {
    /* fall through to metadata */
  }

  let resolvedRole: AdminRole
  if (role) {
    resolvedRole = role
  } else {
    const meta = session.user.app_metadata?.role
    if (meta === 'super_admin' || meta === 'admin' || meta === 'editor') {
      resolvedRole = meta
    } else {
      resolvedRole = 'admin' // historical fallback for accounts pre-dating user_roles
    }
  }

  return {
    id:    session.user.id,
    name:
      session.user.user_metadata?.full_name ??
      session.user.email?.split('@')[0] ??
      'Admin',
    email: session.user.email ?? '',
    role: resolvedRole,
    avatarColor: pickAvatarColor(session.user.id),
  }
}

async function fetchRolePermissions(): Promise<Partial<Record<AdminRole, RolePermissionMap>>> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role, permissions')
    if (error || !data) return {}
    const out: Partial<Record<AdminRole, RolePermissionMap>> = {}
    for (const row of data as Array<{ role: string; permissions: unknown }>) {
      if (row.role === 'admin' || row.role === 'editor') {
        out[row.role] = normalisePermissions(row.permissions)
      }
    }
    return out
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface AuthContextValue {
  user: AdminUser | null
  loggedInAt: string | null
  method: 'password' | 'magic-link' | null
  isAuthenticated: boolean
  isLoading: boolean
  permissions: RolePermissionMap
  rolePermissions: Record<AdminRole, RolePermissionMap>
  login: (email: string, password: string) => Promise<AdminUser>
  loginWithMagicLink: (email: string) => Promise<void>
  logout: () => void
  can: (capability: Capability | LegacyCapability) => boolean
  isSuperAdmin: boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loggedInAt, setLoggedInAt] = useState<string | null>(null)
  const [method, setMethod] = useState<'password' | 'magic-link' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [remotePerms, setRemotePerms] =
    useState<Partial<Record<AdminRole, RolePermissionMap>>>({})

  const refreshPermissions = useCallback(async () => {
    const map = await fetchRolePermissions()
    setRemotePerms(map)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const adminUser = await fetchAdminUser(session)
        if (adminUser) {
          setUser(adminUser)
          setLoggedInAt(session.user.created_at ?? new Date().toISOString())
          setMethod('password')
          await refreshPermissions()
        }
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // IMPORTANT: do NOT `await` Supabase queries directly inside this
        // callback. The auth client holds an internal navigator lock during
        // the callback and any `supabase.from(...)` call would deadlock the
        // very sign-in / token-refresh that fired the event. Defer the work
        // to a microtask so the lock is released first.
        if (session) {
          void (async () => {
            const adminUser = await fetchAdminUser(session)
            setUser(adminUser)
            setLoggedInAt(new Date().toISOString())
            if (event === 'SIGNED_IN') setMethod('password')
            await refreshPermissions()
          })()
        } else {
          setUser(null)
          setLoggedInAt(null)
          setMethod(null)
          setRemotePerms({})
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [refreshPermissions])

  const rolePermissions = useMemo<Record<AdminRole, RolePermissionMap>>(() => ({
    super_admin: SUPER_ADMIN_PERMISSIONS,
    admin:  remotePerms.admin  ?? DEFAULT_PERMISSIONS.admin,
    editor: remotePerms.editor ?? DEFAULT_PERMISSIONS.editor,
  }), [remotePerms])

  const permissions = useMemo<RolePermissionMap>(() => {
    if (!user) return blankMap()
    return rolePermissions[user.role]
  }, [user, rolePermissions])

  const isSuperAdmin = user?.role === 'super_admin'

  const login = useCallback(async (email: string, password: string): Promise<AdminUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const adminUser = await fetchAdminUser(data.session)
    if (!adminUser) {
      await supabase.auth.signOut()
      throw new Error('This account does not have admin access.')
    }
    setUser(adminUser)
    setLoggedInAt(new Date().toISOString())
    setMethod('password')
    await refreshPermissions()
    return adminUser
  }, [refreshPermissions])

  const loginWithMagicLink = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) throw new Error(error.message)
    setMethod('magic-link')
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setLoggedInAt(null)
    setMethod(null)
    setRemotePerms({})
  }, [])

  const can = useCallback(
    (capability: Capability | LegacyCapability) => {
      if (!user) return false
      if (user.role === 'super_admin') return true
      const parsed = parseCapability(capability)
      if (!parsed) return false
      return !!rolePermissions[user.role]?.[parsed.module]?.[parsed.action]
    },
    [user, rolePermissions],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loggedInAt,
      method,
      isAuthenticated: !!user,
      isLoading,
      permissions,
      rolePermissions,
      login,
      loginWithMagicLink,
      logout,
      can,
      isSuperAdmin,
      refreshPermissions,
    }),
    [
      user,
      loggedInAt,
      method,
      isLoading,
      permissions,
      rolePermissions,
      login,
      loginWithMagicLink,
      logout,
      can,
      isSuperAdmin,
      refreshPermissions,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Convenience for the default editor permissions (used by the matrix UI). */
export function getDefaultRolePermissions(role: AdminRole): RolePermissionMap {
  return role === 'super_admin'
    ? SUPER_ADMIN_PERMISSIONS
    : DEFAULT_PERMISSIONS[role]
}
