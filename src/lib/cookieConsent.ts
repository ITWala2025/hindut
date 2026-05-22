/**
 * src/lib/cookieConsent.ts
 *
 * Centralised cookie / tracking consent store. The user's choice is
 * persisted in localStorage for 365 days. Components subscribe via
 * `useCookieConsent()`; the analytics module reads `getConsent()` before
 * sending any event.
 *
 * Categories:
 *   - necessary   — always on. Session, auth, CSRF, language preference.
 *                   Required for the site to function; cannot be disabled.
 *   - functional  — UI preferences (e.g. dialog state, last visited page).
 *   - analytics   — first-party traffic measurement (page views, dwell).
 *   - marketing   — third-party advertising. We don't currently set any,
 *                   but we expose the toggle so the banner is future-proof.
 *
 * Consent values older than 365 days are treated as expired and the banner
 * is shown again so the user can renew (GDPR / ePrivacy best practice).
 */

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing'

export interface CookieCategoryState {
  necessary:  true                 // always true — locked on
  functional: boolean
  analytics:  boolean
  marketing:  boolean
}

export type ConsentStatus = 'accepted' | 'rejected' | 'custom'

export interface CookieConsent {
  version:    number               // bump to force re-prompt on policy change
  status:     ConsentStatus
  categories: CookieCategoryState
  /** ISO timestamp when the user made the choice. */
  timestamp:  string
  /** ISO timestamp 365 days after `timestamp` — banner reappears after this. */
  expiresAt:  string
}

const STORAGE_KEY      = 'hai_cookie_consent'
const CONSENT_VERSION  = 1
const CONSENT_TTL_DAYS = 365
const CHANGE_EVENT     = 'hai-cookie-consent-change'

const DEFAULT_CATEGORIES: CookieCategoryState = {
  necessary:  true,
  functional: false,
  analytics:  false,
  marketing:  false,
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
function nowIso(): string {
  return new Date().toISOString()
}

function plusDaysIso(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Reads the stored consent record. Returns `null` if there is no record,
 * if the record is malformed, if the version is outdated, or if it has
 * expired (older than 365 days).
 */
export function getConsent(): CookieConsent | null {
  const ls = safeStorage()
  if (!ls) return null

  let raw: string | null = null
  try {
    raw = ls.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as CookieConsent
    if (!parsed || parsed.version !== CONSENT_VERSION) return null
    if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() < Date.now()) {
      // Expired — wipe so the banner is shown again.
      try { ls.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      return null
    }
    // Make absolutely sure `necessary` is locked on.
    parsed.categories = {
      ...DEFAULT_CATEGORIES,
      ...parsed.categories,
      necessary: true,
    }
    return parsed
  } catch {
    return null
  }
}

export function hasConsented(): boolean {
  return getConsent() !== null
}

export function isCategoryAllowed(category: CookieCategory): boolean {
  if (category === 'necessary') return true
  const consent = getConsent()
  return !!consent?.categories[category]
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
function persist(consent: CookieConsent): void {
  const ls = safeStorage()
  if (!ls) return
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(consent))
  } catch {
    /* storage full / disabled — fall through silently */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CookieConsent>(CHANGE_EVENT, { detail: consent }))
  }
}

function build(status: ConsentStatus, categories: CookieCategoryState): CookieConsent {
  return {
    version:    CONSENT_VERSION,
    status,
    categories: { ...categories, necessary: true },
    timestamp:  nowIso(),
    expiresAt:  plusDaysIso(CONSENT_TTL_DAYS),
  }
}

export function acceptAll(): CookieConsent {
  const consent = build('accepted', {
    necessary:  true,
    functional: true,
    analytics:  true,
    marketing:  true,
  })
  persist(consent)
  return consent
}

export function rejectAll(): CookieConsent {
  const consent = build('rejected', {
    necessary:  true,
    functional: false,
    analytics:  false,
    marketing:  false,
  })
  persist(consent)
  return consent
}

export function saveCustom(categories: Partial<CookieCategoryState>): CookieConsent {
  const merged: CookieCategoryState = {
    ...DEFAULT_CATEGORIES,
    ...categories,
    necessary: true,
  }
  // If they happened to tick every optional category, record as 'accepted';
  // if all are off, record as 'rejected'; otherwise 'custom'.
  const optional = [merged.functional, merged.analytics, merged.marketing]
  const status: ConsentStatus = optional.every(Boolean)
    ? 'accepted'
    : optional.every((v) => !v)
      ? 'rejected'
      : 'custom'

  const consent = build(status, merged)
  persist(consent)
  return consent
}

/** Wipes the consent record so the banner re-appears (used by "withdraw"). */
export function resetConsent(): void {
  const ls = safeStorage()
  if (!ls) return
  try {
    ls.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CookieConsent | null>(CHANGE_EVENT, { detail: null }))
  }
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export type ConsentListener = (consent: CookieConsent | null) => void

/**
 * Subscribe to consent changes. Returns an unsubscribe function. Also
 * listens to `storage` events so a consent change in one tab is reflected
 * in every other tab.
 */
export function subscribeConsent(listener: ConsentListener): () => void {
  if (typeof window === 'undefined') return () => undefined

  const handleChange = (ev: Event) => {
    const ce = ev as CustomEvent<CookieConsent | null>
    listener(ce.detail ?? getConsent())
  }
  const handleStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY) listener(getConsent())
  }
  window.addEventListener(CHANGE_EVENT, handleChange as EventListener)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange as EventListener)
    window.removeEventListener('storage', handleStorage)
  }
}

export const COOKIE_CONSENT_TTL_DAYS = CONSENT_TTL_DAYS
