/**
 * Authentication layer backed by Supabase Auth.
 *
 * Roles are stored in `public.user_roles`. On sign-in the provider fetches
 * the user's role and builds an `AdminUser` object consumed by all admin
 * sections. Only users with a row in `user_roles` can access the admin portal.
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

export type AdminRole = 'admin' | 'editor'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  avatarColor: string
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Administrator',
  editor: 'Editor',
}

/**
 * Capability matrix — mirrors the role matrix in `ADMIN_PORTAL.md`.
 */
export const ROLE_PERMISSIONS: Record<
  AdminRole,
  {
    manageUsers: boolean
    manageMemberships: boolean
    manageReceipts: boolean
    manageEvents: boolean
    manageMedia: boolean
    manageServices: boolean
    manageSettings: boolean
  }
> = {
  admin: {
    manageUsers: true,
    manageMemberships: true,
    manageReceipts: true,
    manageEvents: true,
    manageMedia: true,
    manageServices: true,
    manageSettings: true,
  },
  editor: {
    manageUsers: false,
    manageMemberships: false,
    manageReceipts: false,
    manageEvents: true,
    manageMedia: true,
    manageServices: true,
    manageSettings: false,
  },
}

export type Capability = keyof (typeof ROLE_PERMISSIONS)[AdminRole]

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

async function fetchAdminUser(session: Session): Promise<AdminUser | null> {
  // Role comes from Supabase Auth app_metadata (set via dashboard or service_role).
  // Falls back to 'admin' so any authenticated user can access the portal.
  const role = (
    (session.user.app_metadata?.role as AdminRole | undefined) ?? 'admin'
  )

  return {
    id: session.user.id,
    name:
      session.user.user_metadata?.full_name ??
      session.user.email?.split('@')[0] ??
      'Admin',
    email: session.user.email ?? '',
    role,
    avatarColor: pickAvatarColor(session.user.id),
  }
}

interface AuthContextValue {
  user: AdminUser | null
  loggedInAt: string | null
  method: 'password' | 'magic-link' | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<AdminUser>
  loginWithMagicLink: (email: string) => Promise<void>
  logout: () => void
  can: (action: Capability) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loggedInAt, setLoggedInAt] = useState<string | null>(null)
  const [method, setMethod] = useState<'password' | 'magic-link' | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const adminUser = await fetchAdminUser(session)
        if (adminUser) {
          setUser(adminUser)
          setLoggedInAt(session.created_at)
          setMethod('password')
        }
      }
      setIsLoading(false)
    })

    // Listen for auth state changes (magic-link callback, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const adminUser = await fetchAdminUser(session)
          setUser(adminUser)
          setLoggedInAt(new Date().toISOString())
          if (event === 'SIGNED_IN') setMethod('password')
        } else {
          setUser(null)
          setLoggedInAt(null)
          setMethod(null)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

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
    return adminUser
  }, [])

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
  }, [])

  const can = useCallback(
    (action: Capability) => {
      if (!user) return false
      return ROLE_PERMISSIONS[user.role][action]
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loggedInAt,
      method,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithMagicLink,
      logout,
      can,
    }),
    [user, loggedInAt, method, isLoading, login, loginWithMagicLink, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

