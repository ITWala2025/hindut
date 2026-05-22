/**
 * src/hooks/useAnalytics.ts
 *
 * Loads aggregated analytics data for the admin dashboard from Supabase.
 * Returns time-series, top pages, geography, devices, browsers, referrers,
 * KPIs (visitors, sessions, pageviews, avg engagement time, bounce rate),
 * and a recent-activity feed.
 *
 * The component decides the date range; everything is computed client-side
 * from the queried rows so we stay schema-flexible without server functions.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface AnalyticsRange {
  /** ISO start (inclusive). */
  from: string
  /** ISO end (exclusive). */
  to:   string
  /** Bucket size for time-series ('hour' for <=2 days, else 'day'). */
  bucket: 'hour' | 'day'
}

export interface AnalyticsEventRow {
  id: string
  session_id: string | null
  session_key: string
  visitor_id: string
  event_type: 'pageview' | 'pageleave' | 'click' | 'scroll' | 'custom' | 'error' | 'engagement'
  path: string
  full_url: string | null
  page_title: string | null
  referrer: string | null
  referrer_host: string | null
  country: string | null
  country_code: string | null
  city: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  duration_ms: number | null
  scroll_depth: number | null
  viewport_width: number | null
  viewport_height: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AnalyticsSessionRow {
  id: string
  visitor_id: string
  session_key: string
  country: string | null
  country_code: string | null
  region: string | null
  city: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  language: string | null
  referrer_host: string | null
  landing_path: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  started_at: string
  last_seen_at: string
  pageviews: number
  events_count: number
  total_duration_ms: number
}

interface CountRow { key: string; count: number; secondary?: string }
interface TimeRow  { bucket: string; pageviews: number; visitors: number; sessions: number }
interface PageRow  { path: string; title: string | null; pageviews: number; avgTimeMs: number; uniqueVisitors: number }

export interface AnalyticsSummary {
  kpis: {
    pageviews: number
    uniqueVisitors: number
    sessions: number
    avgEngagementMs: number
    bounceRate: number  // 0..1
    avgPagesPerSession: number
  }
  timeSeries:    TimeRow[]
  topPages:      PageRow[]
  countries:     CountRow[]    // key=country, secondary=country_code
  cities:        CountRow[]
  devices:       CountRow[]
  browsers:      CountRow[]
  operatingSystems: CountRow[]
  referrers:     CountRow[]
  utmSources:    CountRow[]
  recentEvents:  AnalyticsEventRow[]
  sessions_:     AnalyticsSessionRow[]
}

const PAGE_LIMIT = 5000

function bucketKey(iso: string, bucket: 'hour' | 'day'): string {
  const d = new Date(iso)
  if (bucket === 'hour') {
    d.setMinutes(0, 0, 0)
  } else {
    d.setHours(0, 0, 0, 0)
  }
  return d.toISOString()
}

function topN(map: Map<string, { count: number; secondary?: string }>, n: number): CountRow[] {
  return Array.from(map, ([key, v]) => ({ key, count: v.count, secondary: v.secondary }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function useAnalytics(range: AnalyticsRange) {
  const [events,   setEvents]   = useState<AnalyticsEventRow[]>([])
  const [sessions, setSessions] = useState<AnalyticsSessionRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [evtRes, sesRes] = await Promise.all([
          supabase
            .from('analytics_events')
            .select('*')
            .gte('created_at', range.from)
            .lt('created_at', range.to)
            .order('created_at', { ascending: false })
            .limit(PAGE_LIMIT),
          supabase
            .from('analytics_sessions')
            .select('*')
            .gte('started_at', range.from)
            .lt('started_at', range.to)
            .order('started_at', { ascending: false })
            .limit(PAGE_LIMIT),
        ])
        if (cancelled) return
        if (evtRes.error) throw evtRes.error
        if (sesRes.error) throw sesRes.error
        setEvents((evtRes.data as AnalyticsEventRow[]) ?? [])
        setSessions((sesRes.data as AnalyticsSessionRow[]) ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [range.from, range.to])

  const summary: AnalyticsSummary = useMemo(() => {
    // ---------- KPIs --------------------------------------------------------
    const pageviewEvents = events.filter((e) => e.event_type === 'pageview')
    const leaveEvents    = events.filter((e) => e.event_type === 'pageleave' && (e.duration_ms ?? 0) > 0)
    const visitorSet     = new Set<string>()
    const sessionSet     = new Set<string>()
    events.forEach((e) => { visitorSet.add(e.visitor_id); sessionSet.add(e.session_key) })

    const totalDuration = leaveEvents.reduce((s, e) => s + (e.duration_ms ?? 0), 0)
    const avgEngagementMs = leaveEvents.length ? Math.round(totalDuration / leaveEvents.length) : 0

    // Bounce rate: sessions with exactly one pageview / total sessions.
    const pageviewsPerSession = new Map<string, number>()
    pageviewEvents.forEach((e) => {
      pageviewsPerSession.set(e.session_key, (pageviewsPerSession.get(e.session_key) ?? 0) + 1)
    })
    const totalSessionsWithViews = pageviewsPerSession.size
    const bouncedSessions = Array.from(pageviewsPerSession.values()).filter((n) => n === 1).length
    const bounceRate = totalSessionsWithViews
      ? bouncedSessions / totalSessionsWithViews
      : 0
    const avgPagesPerSession = totalSessionsWithViews
      ? pageviewEvents.length / totalSessionsWithViews
      : 0

    // ---------- Time series -------------------------------------------------
    const tsMap = new Map<string, { pageviews: number; visitors: Set<string>; sessions: Set<string> }>()
    // Pre-fill empty buckets so charts span the full range.
    const start = new Date(range.from).getTime()
    const end   = new Date(range.to).getTime()
    const step  = range.bucket === 'hour' ? 3_600_000 : 86_400_000
    for (let t = start; t < end; t += step) {
      tsMap.set(bucketKey(new Date(t).toISOString(), range.bucket), {
        pageviews: 0, visitors: new Set(), sessions: new Set(),
      })
    }
    events.forEach((e) => {
      const k = bucketKey(e.created_at, range.bucket)
      let bucket = tsMap.get(k)
      if (!bucket) {
        bucket = { pageviews: 0, visitors: new Set(), sessions: new Set() }
        tsMap.set(k, bucket)
      }
      if (e.event_type === 'pageview') bucket.pageviews += 1
      bucket.visitors.add(e.visitor_id)
      bucket.sessions.add(e.session_key)
    })
    const timeSeries: TimeRow[] = Array.from(tsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, v]) => ({
        bucket,
        pageviews: v.pageviews,
        visitors:  v.visitors.size,
        sessions:  v.sessions.size,
      }))

    // ---------- Top pages ---------------------------------------------------
    const pageMap = new Map<string, { views: number; durSum: number; durCount: number; visitors: Set<string>; title: string | null }>()
    pageviewEvents.forEach((e) => {
      const row = pageMap.get(e.path) ?? { views: 0, durSum: 0, durCount: 0, visitors: new Set(), title: e.page_title }
      row.views += 1
      row.visitors.add(e.visitor_id)
      if (!row.title && e.page_title) row.title = e.page_title
      pageMap.set(e.path, row)
    })
    leaveEvents.forEach((e) => {
      const row = pageMap.get(e.path)
      if (!row) return
      row.durSum += e.duration_ms ?? 0
      row.durCount += 1
    })
    const topPages: PageRow[] = Array.from(pageMap, ([path, v]) => ({
      path,
      title: v.title,
      pageviews: v.views,
      avgTimeMs: v.durCount ? Math.round(v.durSum / v.durCount) : 0,
      uniqueVisitors: v.visitors.size,
    })).sort((a, b) => b.pageviews - a.pageviews).slice(0, 20)

    // ---------- Dimensional breakdowns (from sessions) ----------------------
    const countryMap = new Map<string, { count: number; secondary?: string }>()
    const cityMap    = new Map<string, { count: number; secondary?: string }>()
    const deviceMap  = new Map<string, { count: number }>()
    const browserMap = new Map<string, { count: number }>()
    const osMap      = new Map<string, { count: number }>()
    const refMap     = new Map<string, { count: number }>()
    const utmMap     = new Map<string, { count: number }>()
    sessions.forEach((s) => {
      const c = s.country || (s.country_code ? s.country_code : 'Unknown')
      const cur = countryMap.get(c) ?? { count: 0, secondary: s.country_code ?? undefined }
      cur.count += 1; if (s.country_code) cur.secondary = s.country_code
      countryMap.set(c, cur)

      if (s.city) {
        const cc = cityMap.get(s.city) ?? { count: 0, secondary: s.country ?? undefined }
        cc.count += 1; cityMap.set(s.city, cc)
      }

      const dev = s.device_type || 'unknown'
      deviceMap.set(dev, { count: (deviceMap.get(dev)?.count ?? 0) + 1 })
      const br  = s.browser || 'Unknown'
      browserMap.set(br, { count: (browserMap.get(br)?.count ?? 0) + 1 })
      const o   = s.os || 'Unknown'
      osMap.set(o, { count: (osMap.get(o)?.count ?? 0) + 1 })

      const refHost = s.referrer_host || '(direct)'
      refMap.set(refHost, { count: (refMap.get(refHost)?.count ?? 0) + 1 })

      const utm = s.utm_source || '(none)'
      utmMap.set(utm, { count: (utmMap.get(utm)?.count ?? 0) + 1 })
    })

    return {
      kpis: {
        pageviews:        pageviewEvents.length,
        uniqueVisitors:   visitorSet.size,
        sessions:         sessionSet.size,
        avgEngagementMs,
        bounceRate,
        avgPagesPerSession,
      },
      timeSeries,
      topPages,
      countries: topN(countryMap, 30),
      cities:    topN(cityMap, 20),
      devices:   topN(deviceMap, 10),
      browsers:  topN(browserMap, 10),
      operatingSystems: topN(osMap, 10),
      referrers: topN(refMap, 15),
      utmSources: topN(utmMap, 10),
      recentEvents: events.slice(0, 100),
      sessions_: sessions,
    }
  }, [events, sessions, range.from, range.to, range.bucket])

  return { summary, loading, error, refresh: () => setEvents((e) => [...e]) }
}
