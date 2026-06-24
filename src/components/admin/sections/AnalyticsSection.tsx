/**
 * src/components/admin/sections/AnalyticsSection.tsx
 *
 * Comprehensive analytics dashboard for the admin portal. Pulls from
 * `analytics_events` / `analytics_sessions` via useAnalytics and renders:
 *   - KPIs: visitors, sessions, pageviews, avg engagement time, bounce rate,
 *           pages per session
 *   - Traffic time-series (visitors + pageviews)
 *   - Top pages (with avg time on page, unique visitors)
 *   - Geography: country + city breakdown
 *   - Devices, browsers, operating systems
 *   - Referrers + UTM sources
 *   - Recent activity feed
 *   - CSV export
 */
import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Users,
  Eye,
  ClockClockwise,
  Globe,
  ArrowsClockwise,
  DownloadSimple,
  DeviceMobile,
  ArrowSquareOut,
  Browsers,
  MapPin,
  Path,
} from '@phosphor-icons/react'
import { KpiCard, SectionCard } from '@/components/admin/adminUi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAnalytics, type AnalyticsRange } from '@/hooks/useAnalytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RANGE_OPTIONS: { id: string; label: string; days: number; bucket: 'hour' | 'day' }[] = [
  { id: 'today',  label: 'Today',          days: 1,   bucket: 'hour' },
  { id: '24h',    label: 'Last 24 hours',  days: 1,   bucket: 'hour' },
  { id: '7d',     label: 'Last 7 days',    days: 7,   bucket: 'day'  },
  { id: '30d',    label: 'Last 30 days',   days: 30,  bucket: 'day'  },
  { id: '90d',    label: 'Last 90 days',   days: 90,  bucket: 'day'  },
  { id: '12m',    label: 'Last 12 months', days: 365, bucket: 'day'  },
]

function buildRange(id: string): AnalyticsRange {
  const opt = RANGE_OPTIONS.find((o) => o.id === id) ?? RANGE_OPTIONS[2]
  const to = new Date()
  const from = new Date()
  if (opt.id === 'today') {
    from.setHours(0, 0, 0, 0)
  } else {
    from.setTime(to.getTime() - opt.days * 86_400_000)
  }
  return { from: from.toISOString(), to: to.toISOString(), bucket: opt.bucket }
}

function formatMs(ms: number): string {
  if (!ms || ms < 1000) return `${Math.max(0, Math.round(ms))}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return `${m}m ${rs}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function formatBucket(iso: string, bucket: 'hour' | 'day'): string {
  const d = new Date(iso)
  if (bucket === 'hour') {
    return d.toLocaleString('en-IE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
  }
  return d.toLocaleDateString('en-IE', { day: '2-digit', month: 'short' })
}

function countryFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '🌐'
  const cc = code.toUpperCase()
  return String.fromCodePoint(...cc.split('').map((c) => 127397 + c.charCodeAt(0)))
}

const PIE_COLORS = ['#ea580c', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4']

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AnalyticsSection() {
  const [rangeId, setRangeId] = useState('7d')
  const range = useMemo(() => buildRange(rangeId), [rangeId])
  const { summary, loading, error, refresh } = useAnalytics(range)

  const exportSessions = () => {
    downloadCsv(
      `hai-analytics-sessions-${rangeId}.csv`,
      summary.sessions_.map((s) => ({
        started_at: s.started_at,
        country: s.country,
        country_code: s.country_code,
        city: s.city,
        region: s.region,
        device_type: s.device_type,
        browser: s.browser,
        os: s.os,
        language: s.language,
        referrer_host: s.referrer_host,
        landing_path: s.landing_path,
        utm_source: s.utm_source,
        utm_medium: s.utm_medium,
        utm_campaign: s.utm_campaign,
        pageviews: s.pageviews,
        duration_ms: s.total_duration_ms,
      })),
    )
  }

  if (error) {
    return (
      <SectionCard title="Analytics" description="Live site analytics">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load analytics: {error}
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-br from-orange-600 via-orange-700 to-amber-600 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Site Analytics
            </h2>
            <p className="text-orange-50/90 mt-1">
              Visitors, engagement, and geography across the public site.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={rangeId} onValueChange={setRangeId}>
              <SelectTrigger className="w-[200px] bg-white text-orange-900 border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={refresh} disabled={loading} className="bg-white text-orange-800 hover:bg-orange-50">
              <ArrowsClockwise size={18} weight="bold" className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
            <Button variant="secondary" onClick={exportSessions} className="bg-white text-orange-800 hover:bg-orange-50">
              <DownloadSimple size={18} weight="bold" className="mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard label="Unique visitors" value={summary.kpis.uniqueVisitors.toLocaleString()} icon={<Users size={24} weight="duotone" />} accent="orange" />
        <KpiCard label="Pageviews"       value={summary.kpis.pageviews.toLocaleString()}      icon={<Eye   size={24} weight="duotone" />} accent="amber"  />
        <KpiCard label="Sessions"        value={summary.kpis.sessions.toLocaleString()}       icon={<Browsers size={24} weight="duotone" />} accent="blue" />
        <KpiCard label="Avg engagement"  value={formatMs(summary.kpis.avgEngagementMs)}       icon={<ClockClockwise size={24} weight="duotone" />} accent="green" />
        <KpiCard label="Bounce rate"     value={formatPct(summary.kpis.bounceRate)}           icon={<ArrowSquareOut size={24} weight="duotone" />} accent="red" />
        <KpiCard label="Pages / session" value={summary.kpis.avgPagesPerSession.toFixed(2)}   icon={<Path size={24} weight="duotone" />}  accent="orange" />
      </div>

      {/* Time series */}
      <SectionCard
        title="Traffic over time"
        description={loading ? 'Loading…' : `${summary.timeSeries.length} buckets · ${range.bucket === 'hour' ? 'hourly' : 'daily'} granularity`}
      >
        <div className="h-[320px] w-full">
          <ResponsiveContainer>
            <AreaChart data={summary.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ea580c" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="vsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="bucket"
                tickFormatter={(v) => formatBucket(v, range.bucket)}
                tick={{ fontSize: 11, fill: '#64748b' }}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                labelFormatter={(v) => formatBucket(v as string, range.bucket)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#ea580c" fill="url(#pvGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="visitors"  name="Visitors"  stroke="#3b82f6" fill="url(#vsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Pages + Countries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard
          title="Top pages"
          description="Most viewed paths with average time on page."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Visitors</TableHead>
                  <TableHead className="text-right">Avg time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topPages.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No data yet.</TableCell></TableRow>
                ) : summary.topPages.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[280px]" title={p.path}>{p.path}</div>
                      {p.title && <div className="text-xs text-muted-foreground truncate max-w-[280px]">{p.title}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.pageviews.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.uniqueVisitors.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMs(p.avgTimeMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard
          title="Countries"
          description="Where your visitors are coming from."
          actions={<Badge variant="outline" className="border-orange-300 text-orange-700">
            <Globe size={14} className="mr-1" /> {summary.countries.length} countries
          </Badge>}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.countries.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No data yet.</TableCell></TableRow>
                ) : (() => {
                  const total = summary.countries.reduce((s, r) => s + r.count, 0) || 1
                  return summary.countries.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell className="font-medium">
                        <span className="text-lg mr-2">{countryFlag(c.secondary)}</span>
                        {c.key}
                        {c.secondary && <span className="ml-2 text-xs text-muted-foreground">({c.secondary})</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{((c.count / total) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))
                })()}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>

      {/* Devices + Browsers + OS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BreakdownPie title="Devices"  icon={<DeviceMobile size={18} weight="duotone" />} data={summary.devices}  />
        <BreakdownPie title="Browsers" icon={<Browsers     size={18} weight="duotone" />} data={summary.browsers} />
        <BreakdownPie title="Operating systems" data={summary.operatingSystems} />
      </div>

      {/* Referrers + UTM + Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BreakdownBar title="Top referrers"  data={summary.referrers}  />
        <BreakdownBar title="UTM sources"    data={summary.utmSources} />
        <SectionCard title="Top cities" description="Inferred from IP geolocation.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {summary.cities.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No data yet.</TableCell></TableRow>
                ) : summary.cities.map((c) => (
                  <TableRow key={c.key}>
                    <TableCell className="font-medium"><MapPin size={14} className="inline mr-1 text-orange-600" />{c.key}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.secondary ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>

      {/* Recent activity */}
      <SectionCard
        title="Recent activity"
        description="Most recent 100 events captured."
      >
        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="events">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {summary.recentEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No events yet.</TableCell></TableRow>
                  ) : summary.recentEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString('en-IE')}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{e.event_type}</Badge></TableCell>
                      <TableCell className="font-medium truncate max-w-[260px]" title={e.path}>{e.path}</TableCell>
                      <TableCell><span className="mr-1">{countryFlag(e.country_code)}</span>{e.country ?? e.country_code ?? '—'}</TableCell>
                      <TableCell className="capitalize text-sm">{e.device_type ?? '—'} · {e.browser ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{e.duration_ms ? formatMs(e.duration_ms) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="sessions">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="text-right">Pageviews</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {summary.sessions_.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No sessions yet.</TableCell></TableRow>
                  ) : summary.sessions_.slice(0, 100).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(s.started_at).toLocaleString('en-IE')}</TableCell>
                      <TableCell className="font-mono text-xs">{s.visitor_id.slice(0, 8)}…</TableCell>
                      <TableCell><span className="mr-1">{countryFlag(s.country_code)}</span>{s.country ?? '—'}{s.city ? ` · ${s.city}` : ''}</TableCell>
                      <TableCell className="capitalize text-sm">{s.device_type ?? '—'} · {s.browser ?? '—'} · {s.os ?? '—'}</TableCell>
                      <TableCell className="text-sm">{s.referrer_host ?? '(direct)'}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.pageviews}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMs(s.total_duration_ms)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function BreakdownPie({
  title, icon, data,
}: { title: string; icon?: React.ReactNode; data: { key: string; count: number }[] }) {
  return (
    <SectionCard title={title} actions={icon ? <span className="text-orange-700">{icon}</span> : undefined}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="key"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}

function BreakdownBar({
  title, data,
}: { title: string; data: { key: string; count: number }[] }) {
  return (
    <SectionCard title={title}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <YAxis type="category" dataKey="key" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#ea580c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}
