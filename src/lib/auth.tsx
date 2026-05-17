/**
 * Phase 1: Mock authentication layer for the admin portal.
 *
 * Mirrors the Supabase Auth setup described in
 * `Plan/ADMIN_PORTAL.md` — email + password login plus an optional
 * magic-link flow, with two roles (`admin`, `editor`) backed by a
 * capability matrix. No real backend; the active session is persisted
 * in `localStorage` so refreshes don't bounce the user.
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

export type AdminRole = 'admin' | 'editor'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  avatarColor: string
}

interface StoredUser extends AdminUser {
  password: string
}

interface Session {
  user: AdminUser
  loggedInAt: string
  method: 'password' | 'magic-link'
}

const STORAGE_KEY = 'hai.admin.session.v1'

export const MOCK_USERS: StoredUser[] = [
  {
    id: 'u-admin',
    name: 'Aarav Sharma',
    email: 'admin@hindut.ie',
    password: 'admin123',
    role: 'admin',
    avatarColor: 'from-orange-600 to-amber-600',
  },
  {
    id: 'u-editor',
    name: 'Priya Iyer',
    email: 'editor@hindut.ie',
    password: 'editor123',
    role: 'editor',
    avatarColor: 'from-amber-500 to-yellow-500',
  },
]

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Administrator',
  editor: 'Editor',
}

/**
 * Capability matrix mirroring the role matrix in `ADMIN_PORTAL.md`:
 * - admin: full CRUD on users, memberships, receipts, events, media, settings
 * - editor: read/update events & media; no access to users, memberships,
 *   receipts, or org-level settings.
 */
export const ROLE_PERMISSIONS: Record<
  AdminRole,
  {
    manageUsers: boolean
    manageMemberships: boolean
    manageReceipts: boolean
    manageEvents: boolean
    manageMedia: boolean
    manageSettings: boolean
  }
> = {
  admin: {
    manageUsers: true,
    manageMemberships: true,
    manageReceipts: true,
    manageEvents: true,
    manageMedia: true,
    manageSettings: true,
  },
  editor: {
    manageUsers: false,
    manageMemberships: false,
    manageReceipts: false,
    manageEvents: true,
    manageMedia: true,
    manageSettings: false,
  },
}

export type Capability = keyof (typeof ROLE_PERMISSIONS)[AdminRole]

interface AuthContextValue {
  user: AdminUser | null
  loggedInAt: string | null
  method: Session['method'] | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AdminUser>
  loginWithMagicLink: (email: string) => Promise<AdminUser>
  logout: () => void
  can: (action: Capability) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.user?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)

  useEffect(() => {
    try {
      if (session) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [session])

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 700))
    const match = MOCK_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    )
    if (!match) throw new Error('Invalid email or password.')
    const { password: _pw, ...safe } = match
    void _pw
    setSession({ user: safe, loggedInAt: new Date().toISOString(), method: 'password' })
    return safe
  }, [])

  const loginWithMagicLink = useCallback(async (email: string) => {
    // Simulate the email round-trip a real magic link would take.
    await new Promise((r) => setTimeout(r, 1200))
    const match = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (!match) {
      throw new Error('No account is registered with that email.')
    }
    const { password: _pw, ...safe } = match
    void _pw
    setSession({
      user: safe,
      loggedInAt: new Date().toISOString(),
      method: 'magic-link',
    })
    return safe
  }, [])

  const logout = useCallback(() => setSession(null), [])

  const can = useCallback<AuthContextValue['can']>(
    (action) => {
      if (!session) return false
      return ROLE_PERMISSIONS[session.user.role][action]
    },
    [session],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      loggedInAt: session?.loggedInAt ?? null,
      method: session?.method ?? null,
      isAuthenticated: !!session,
      login,
      loginWithMagicLink,
      logout,
      can,
    }),
    [session, login, loginWithMagicLink, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.')
  return ctx
}
