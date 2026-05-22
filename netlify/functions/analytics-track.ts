/**
 * netlify/functions/analytics-track.ts
 *
 * First-party site-analytics ingestion endpoint.
 *
 * - Accepts a small JSON payload (or sendBeacon Blob) describing a single
 *   analytics event (`pageview`, `pageleave`, `click`, `scroll`, `engagement`,
 *   `custom`, `error`).
 * - Enriches the event server-side with:
 *     · geo (country / region / city / lat / lon / timezone) via Netlify's
 *       `x-nf-geo` header (base64-encoded JSON) or fallback IP headers.
 *     · a salted IP hash so the raw IP is never persisted.
 *     · parsed UA → browser / OS / device type.
 * - Upserts an `analytics_sessions` row (creating it on first hit) and inserts
 *   an `analytics_events` row.
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANALYTICS_IP_SALT     (any 16+ char string; rotate to invalidate hashes)
 */

import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

// ---------------------------------------------------------------------------
// Allowed origins. Requests from any other host (local dev, preview deploys,
// staging mirrors, or third-party sites scraping the endpoint) are rejected.
// ---------------------------------------------------------------------------
const ALLOWED_HOSTS = new Set<string>(['www.hindutemple.ie', 'hindutemple.ie'])

function pickAllowedOrigin(originHeader: string | undefined): string {
  if (!originHeader) return 'https://www.hindutemple.ie'
  try {
    const host = new URL(originHeader).hostname.toLowerCase()
    if (ALLOWED_HOSTS.has(host)) return originHeader
  } catch { /* fall through */ }
  return 'https://www.hindutemple.ie'
}

function isOriginAllowed(headers: Record<string, string | undefined>): boolean {
  const candidates = [headers['origin'], headers['referer']]
  for (const c of candidates) {
    if (!c) continue
    try {
      if (ALLOWED_HOSTS.has(new URL(c).hostname.toLowerCase())) return true
    } catch { /* ignore malformed */ }
  }
  return false
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
function corsHeaders(originHeader?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  pickAllowedOrigin(originHeader),
    'Vary':                         'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  }
}

// ---------------------------------------------------------------------------
// Lightweight UA parser (no external deps). Covers the common cases.
// ---------------------------------------------------------------------------
interface UaInfo {
  browser: string
  browserVersion: string
  os: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'other'
}

function parseUserAgent(ua: string): UaInfo {
  const u = ua || ''
  const lower = u.toLowerCase()
  const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview/i.test(u)
  let deviceType: UaInfo['deviceType'] = 'desktop'
  if (isBot) deviceType = 'bot'
  else if (/ipad|tablet|playbook|silk|kindle/i.test(u)) deviceType = 'tablet'
  else if (/mobi|iphone|android.+mobile|phone|ipod|blackberry|opera mini|iemobile/i.test(u)) deviceType = 'mobile'

  let os = 'Unknown'
  if (/windows nt 10/i.test(u)) os = 'Windows 10/11'
  else if (/windows nt 6\.3/i.test(u)) os = 'Windows 8.1'
  else if (/windows nt 6\.[12]/i.test(u)) os = 'Windows 7/8'
  else if (/mac os x/i.test(u)) os = 'macOS'
  else if (/android/i.test(u)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(u)) os = 'iOS'
  else if (/cros/i.test(u)) os = 'ChromeOS'
  else if (/linux/i.test(u)) os = 'Linux'

  let browser = 'Unknown'
  let version = ''
  const match = (re: RegExp): string => {
    const m = u.match(re)
    return m && m[1] ? m[1] : ''
  }
  if (lower.includes('edg/')) {
    browser = 'Edge'
    version = match(/Edg\/([\d.]+)/)
  } else if (lower.includes('opr/') || lower.includes('opera')) {
    browser = 'Opera'
    version = match(/(?:OPR|Opera)\/([\d.]+)/)
  } else if (lower.includes('chrome/') && !lower.includes('chromium')) {
    browser = 'Chrome'
    version = match(/Chrome\/([\d.]+)/)
  } else if (lower.includes('firefox/')) {
    browser = 'Firefox'
    version = match(/Firefox\/([\d.]+)/)
  } else if (lower.includes('safari/') && lower.includes('version/')) {
    browser = 'Safari'
    version = match(/Version\/([\d.]+)/)
  } else if (isBot) {
    browser = 'Bot'
  }

  return { browser, browserVersion: version, os, deviceType }
}

// ---------------------------------------------------------------------------
// Geo: decode Netlify's x-nf-geo header (base64 JSON).
// Schema (Netlify): { city, country: { code, name }, subdivision: { code, name },
//                    latitude, longitude, timezone }
// ---------------------------------------------------------------------------
interface GeoInfo {
  country?: string
  countryCode?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

function parseGeo(headers: Record<string, string | undefined>): GeoInfo {
  const raw = headers['x-nf-geo']
  if (raw) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8')
      const j = JSON.parse(decoded)
      return {
        country:     j?.country?.name,
        countryCode: j?.country?.code,
        region:      j?.subdivision?.name,
        city:        j?.city,
        latitude:    typeof j?.latitude  === 'number' ? j.latitude  : undefined,
        longitude:   typeof j?.longitude === 'number' ? j.longitude : undefined,
        timezone:    j?.timezone,
      }
    } catch {
      // fall through
    }
  }
  // Fallbacks (some Netlify plans / proxies)
  const cc = headers['x-country'] || headers['cf-ipcountry']
  return cc ? { countryCode: cc.toUpperCase() } : {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientIp(headers: Record<string, string | undefined>): string {
  const fwd = headers['x-forwarded-for'] || ''
  return fwd.split(',')[0]?.trim() || headers['client-ip'] || ''
}

function hashIp(ip: string, salt: string): string {
  if (!ip) return ''
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

function safeUrl(value: string | undefined | null): URL | null {
  if (!value) return null
  try { return new URL(value) } catch { return null }
}

function safeString(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function safeInt(v: unknown, min = 0, max = 1_000_000_000): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  if (n < min || n > max) return null
  return Math.round(n)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler: Handler = async (event) => {
  // Normalise headers up-front so we can use them for CORS + origin checks.
  const hdrs: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(event.headers || {})) hdrs[k.toLowerCase()] = v as string | undefined
  const cors = corsHeaders(hdrs['origin'])

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  // Reject any caller that isn't the production site.
  if (!isOriginAllowed(hdrs)) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed' }) }
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const salt        = process.env.ANALYTICS_IP_SALT || 'default-salt-change-me'
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Analytics not configured' }) }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  // Required fields ----------------------------------------------------------
  const visitorId  = safeString(payload.visitorId, 64)
  const sessionKey = safeString(payload.sessionKey, 64)
  const eventType  = safeString(payload.eventType, 32)
  const path       = safeString(payload.path, 500) || '/'
  const allowedTypes = ['pageview', 'pageleave', 'click', 'scroll', 'custom', 'error', 'engagement']
  if (!visitorId || !sessionKey || !eventType || !allowedTypes.includes(eventType)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing or invalid fields' }) }
  }

  // Headers / enrichment -----------------------------------------------------
  const headers: Record<string, string | undefined> = hdrs

  const ua    = headers['user-agent'] || safeString(payload.userAgent, 500) || ''
  const uaInfo = parseUserAgent(ua)
  const geo    = parseGeo(headers)
  const ip     = getClientIp(headers)
  const ipHash = hashIp(ip, salt)

  const referrer     = safeString(payload.referrer, 1000)
  const referrerHost = safeUrl(referrer)?.host ?? null
  const fullUrl      = safeString(payload.url, 1000)
  const pageTitle    = safeString(payload.title, 500)

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // -------------------------------------------------------------------------
  // Upsert session (idempotent on session_key). On insert we record the
  // landing details; on subsequent hits we only refresh last_seen_at &
  // counters via the increment below.
  // -------------------------------------------------------------------------
  const { data: existingSession } = await supabase
    .from('analytics_sessions')
    .select('id, pageviews, events_count, total_duration_ms')
    .eq('session_key', sessionKey)
    .maybeSingle()

  let sessionId: string | null = existingSession?.id ?? null

  if (!sessionId) {
    const { data: inserted, error: insertErr } = await supabase
      .from('analytics_sessions')
      .insert({
        visitor_id:      visitorId,
        session_key:     sessionKey,
        ip_hash:         ipHash || null,
        country:         geo.country     ?? null,
        country_code:    geo.countryCode ?? null,
        region:          geo.region      ?? null,
        city:            geo.city        ?? null,
        latitude:        geo.latitude    ?? null,
        longitude:       geo.longitude   ?? null,
        timezone:        geo.timezone ?? safeString(payload.timezone, 100),
        user_agent:      ua.slice(0, 500),
        browser:         uaInfo.browser,
        browser_version: uaInfo.browserVersion,
        os:              uaInfo.os,
        device_type:     uaInfo.deviceType,
        screen_width:    safeInt(payload.screenWidth, 0, 20000),
        screen_height:   safeInt(payload.screenHeight, 0, 20000),
        viewport_width:  safeInt(payload.viewportWidth, 0, 20000),
        viewport_height: safeInt(payload.viewportHeight, 0, 20000),
        language:        safeString(payload.language, 50),
        referrer:        referrer,
        referrer_host:   referrerHost,
        landing_path:    path,
        utm_source:      safeString(payload.utmSource, 200),
        utm_medium:      safeString(payload.utmMedium, 200),
        utm_campaign:    safeString(payload.utmCampaign, 200),
        utm_term:        safeString(payload.utmTerm, 200),
        utm_content:     safeString(payload.utmContent, 200),
        pageviews:       eventType === 'pageview' ? 1 : 0,
        events_count:    1,
      })
      .select('id')
      .single()
    if (insertErr || !inserted) {
      // Race: another concurrent request may have created the row. Re-read.
      const { data: refetch } = await supabase
        .from('analytics_sessions')
        .select('id')
        .eq('session_key', sessionKey)
        .maybeSingle()
      sessionId = refetch?.id ?? null
    } else {
      sessionId = inserted.id
    }
  } else {
    const dur = safeInt(payload.durationMs, 0, 24 * 60 * 60 * 1000) ?? 0
    await supabase
      .from('analytics_sessions')
      .update({
        last_seen_at:     new Date().toISOString(),
        pageviews:        (existingSession.pageviews    ?? 0) + (eventType === 'pageview' ? 1 : 0),
        events_count:     (existingSession.events_count ?? 0) + 1,
        total_duration_ms:(existingSession.total_duration_ms ?? 0) + dur,
      })
      .eq('id', sessionId!)
  }

  // -------------------------------------------------------------------------
  // Insert event row
  // -------------------------------------------------------------------------
  const { error: evtErr } = await supabase.from('analytics_events').insert({
    session_id:     sessionId,
    session_key:    sessionKey,
    visitor_id:     visitorId,
    event_type:     eventType,
    path,
    full_url:       fullUrl,
    page_title:     pageTitle,
    referrer,
    referrer_host:  referrerHost,
    country:        geo.country     ?? null,
    country_code:   geo.countryCode ?? null,
    city:           geo.city        ?? null,
    device_type:    uaInfo.deviceType,
    browser:        uaInfo.browser,
    os:             uaInfo.os,
    duration_ms:    safeInt(payload.durationMs, 0, 24 * 60 * 60 * 1000),
    scroll_depth:   safeInt(payload.scrollDepth, 0, 100),
    viewport_width: safeInt(payload.viewportWidth, 0, 20000),
    viewport_height:safeInt(payload.viewportHeight, 0, 20000),
    metadata:       (payload.metadata && typeof payload.metadata === 'object') ? payload.metadata : {},
  })

  if (evtErr) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: evtErr.message }) }
  }

  return { statusCode: 204, headers: cors, body: '' }
}
