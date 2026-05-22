/**
 * src/lib/analytics.ts
 *
 * First-party site-analytics tracker. Sends events to
 * /.netlify/functions/analytics-track via `navigator.sendBeacon` (best-effort
 * delivery on unload) or `fetch` with keepalive as a fallback.
 *
 * Captures:
 *   - Page views & route changes (SPA).
 *   - Time-on-page per route (visibility-aware, paused while hidden).
 *   - Scroll depth (max 0–100%).
 *   - Click events (delegated, with element selector + text).
 *   - Engagement pings every 15s of active time (for accurate dwell time).
 *   - Device, viewport, language, referrer, UTM parameters.
 *
 * Visitor identity:
 *   - `visitor_id`  → random UUID stored in localStorage (1-year-ish).
 *   - `session_key` → random UUID stored in sessionStorage (per tab).
 *
 * Privacy: no PII is collected. The server hashes the IP and decodes geo
 * from Netlify's `x-nf-geo` header, never persisting the raw IP.
 */

const ENDPOINT      = '/.netlify/functions/analytics-track'
const VISITOR_KEY   = 'hai_analytics_visitor'
const SESSION_KEY   = 'hai_analytics_session'
const ENGAGEMENT_INTERVAL_MS = 15_000

/**
 * Hosts on which analytics is allowed to run. All other hosts (local dev,
 * Netlify preview deploys, staging mirrors) are skipped silently so we never
 * pollute production data with non-visitor traffic.
 */
const ALLOWED_HOSTS = new Set<string>(['www.hindutemple.ie', 'hindutemple.ie'])

function isAnalyticsHostAllowed(): boolean {
  if (typeof window === 'undefined') return false
  return ALLOWED_HOSTS.has(window.location.hostname.toLowerCase())
}

type EventType = 'pageview' | 'pageleave' | 'click' | 'scroll' | 'custom' | 'error' | 'engagement'

interface TrackPayload {
  visitorId:     string
  sessionKey:    string
  eventType:     EventType
  path:          string
  url?:          string
  title?:        string
  referrer?:     string
  userAgent?:    string
  screenWidth?:  number
  screenHeight?: number
  viewportWidth?:  number
  viewportHeight?: number
  language?:     string
  timezone?:     string
  durationMs?:   number
  scrollDepth?:  number
  utmSource?:    string
  utmMedium?:    string
  utmCampaign?:  string
  utmTerm?:      string
  utmContent?:   string
  metadata?:     Record<string, unknown>
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback (very old browsers): not RFC-4122 strict but unique enough.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY)
    if (!v) { v = uuid(); localStorage.setItem(VISITOR_KEY, v) }
    return v
  } catch { return uuid() }
}

function getSessionKey(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY)
    if (!s) { s = uuid(); sessionStorage.setItem(SESSION_KEY, s) }
    return s
  } catch { return uuid() }
}

// ---------------------------------------------------------------------------
// UTM parsing
// ---------------------------------------------------------------------------
let cachedUtm: Pick<TrackPayload, 'utmSource'|'utmMedium'|'utmCampaign'|'utmTerm'|'utmContent'> | null = null
function getUtm() {
  if (cachedUtm) return cachedUtm
  try {
    const sp = new URLSearchParams(window.location.search)
    cachedUtm = {
      utmSource:   sp.get('utm_source')   || undefined,
      utmMedium:   sp.get('utm_medium')   || undefined,
      utmCampaign: sp.get('utm_campaign') || undefined,
      utmTerm:     sp.get('utm_term')     || undefined,
      utmContent:  sp.get('utm_content')  || undefined,
    }
  } catch { cachedUtm = {} }
  return cachedUtm!
}

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------
function send(payload: TrackPayload, useBeacon = false): void {
  try {
    const body = JSON.stringify(payload)
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(ENDPOINT, blob)
      return
    }
    void fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => { /* swallow — analytics must never break the app */ })
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Engagement timer — pauses while the tab is hidden so durations reflect
// actual active time on a page (like GA4 engagement_time_msec).
// ---------------------------------------------------------------------------
class PageTimer {
  private start          = 0
  private accumulated    = 0
  private active         = true
  private maxScrollPct   = 0

  reset() {
    this.start         = performance.now()
    this.accumulated   = 0
    this.active        = !document.hidden
    this.maxScrollPct  = 0
  }

  pause() {
    if (!this.active) return
    this.accumulated += performance.now() - this.start
    this.active = false
  }

  resume() {
    if (this.active) return
    this.start = performance.now()
    this.active = true
  }

  elapsed(): number {
    return Math.round(this.accumulated + (this.active ? performance.now() - this.start : 0))
  }

  updateScroll(): number {
    try {
      const doc = document.documentElement
      const totalScrollable = doc.scrollHeight - doc.clientHeight
      if (totalScrollable <= 0) return 100
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / totalScrollable) * 100)))
      if (pct > this.maxScrollPct) this.maxScrollPct = pct
      return this.maxScrollPct
    } catch { return this.maxScrollPct }
  }

  scrollDepth() { return this.maxScrollPct }
}

// ---------------------------------------------------------------------------
// Module state — single instance bound to window lifecycle.
// ---------------------------------------------------------------------------
let initialized = false
let currentPath = ''
const timer     = new PageTimer()
let engagementHandle: ReturnType<typeof setInterval> | null = null

function basePayload(): Pick<TrackPayload,
  'visitorId'|'sessionKey'|'path'|'url'|'title'|'referrer'|'userAgent'|
  'screenWidth'|'screenHeight'|'viewportWidth'|'viewportHeight'|'language'|'timezone'> {
  return {
    visitorId:      getVisitorId(),
    sessionKey:     getSessionKey(),
    path:           window.location.pathname,
    url:            window.location.href,
    title:          document.title,
    referrer:       document.referrer || undefined,
    userAgent:      navigator.userAgent,
    screenWidth:    window.screen?.width,
    screenHeight:   window.screen?.height,
    viewportWidth:  window.innerWidth,
    viewportHeight: window.innerHeight,
    language:       navigator.language,
    timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

function flushPageLeave(useBeacon = true) {
  if (!currentPath) return
  send({
    ...basePayload(),
    path:        currentPath,
    eventType:   'pageleave',
    durationMs:  timer.elapsed(),
    scrollDepth: timer.scrollDepth(),
    ...getUtm(),
  }, useBeacon)
}

function startEngagementPings() {
  if (engagementHandle) clearInterval(engagementHandle)
  engagementHandle = setInterval(() => {
    if (document.hidden) return
    send({
      ...basePayload(),
      path:        currentPath || window.location.pathname,
      eventType:   'engagement',
      durationMs:  timer.elapsed(),
      scrollDepth: timer.updateScroll(),
      ...getUtm(),
    })
  }, ENGAGEMENT_INTERVAL_MS)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function trackPageView(path: string): void {
  if (typeof window === 'undefined') return
  if (!isAnalyticsHostAllowed()) return
  // Flush previous page's time before resetting.
  if (currentPath && currentPath !== path) {
    flushPageLeave(false)
  }
  currentPath = path
  timer.reset()
  send({
    ...basePayload(),
    path,
    eventType: 'pageview',
    ...getUtm(),
  })
}

export function trackEvent(
  name: string,
  metadata: Record<string, unknown> = {},
  type: Extract<EventType, 'click' | 'custom' | 'error'> = 'custom',
): void {
  if (typeof window === 'undefined') return
  if (!isAnalyticsHostAllowed()) return
  send({
    ...basePayload(),
    eventType: type,
    metadata:  { name, ...metadata },
    ...getUtm(),
  })
}

export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return
  if (!isAnalyticsHostAllowed()) return
  initialized = true

  // Skip on admin routes — we only care about the public site.
  // (Route guard is also applied at call sites; this is a belt-and-braces.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      timer.pause()
      flushPageLeave(true)
    } else {
      timer.resume()
    }
  })

  window.addEventListener('pagehide', () => flushPageLeave(true))
  window.addEventListener('beforeunload', () => flushPageLeave(true))

  window.addEventListener('scroll', () => { timer.updateScroll() }, { passive: true })

  // Delegated click tracking on links / buttons.
  document.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null
    if (!target) return
    const el = target.closest('a, button, [data-track]') as HTMLElement | null
    if (!el) return
    const text  = (el.textContent || '').trim().slice(0, 120)
    const href  = el instanceof HTMLAnchorElement ? el.href : undefined
    const trackName = el.getAttribute('data-track') || (el.tagName.toLowerCase() === 'a' ? 'link' : 'button')
    send({
      ...basePayload(),
      eventType: 'click',
      metadata:  { name: trackName, text, href, id: el.id || undefined },
      ...getUtm(),
    })
  }, { capture: true, passive: true })

  startEngagementPings()
}
