/**
 * StripePaymentsCard.tsx
 *
 * Admin-only management surface for Stripe configuration:
 *   • Current mode (test/live) and resolution source (host / env / db)
 *   • Stripe account snapshot fetched via stripe.accounts.retrieve
 *   • Status of all six required env vars (no values are exposed — only
 *     a boolean indicating whether they're present in Netlify)
 *   • Mode override radio (Auto / Force test / Force live) persisted to
 *     the singleton `payment_settings` row
 *
 * Secret keys are NEVER edited from this UI — they live exclusively in
 * Netlify environment variables.  This page lets admins toggle the mode
 * (e.g. for a controlled rehearsal of live keys) and verify their wiring.
 */
import { useEffect, useState } from 'react'
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Spinner,
  Warning,
  Lock,
  ArrowSquareOut,
  Lightning,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/admin/adminUi'
import { supabase } from '@/lib/supabase'
import { resetStripeCache } from '@/lib/stripeClient'
import { cn } from '@/lib/utils'
import { StripeProductCatalogue } from '@/components/admin/sections/StripeProductCatalogue'
import { useMembership } from '@/hooks/useMembership'

type Mode       = 'test' | 'live'
type Source     = 'db-override' | 'env-override' | 'host'
type Override   = 'auto' | 'test' | 'live'

interface PaymentSettings {
  mode:            Mode
  source:          Source
  modeOverride:    Override
  updatedAt:       string | null
  notes:           string | null
  productionHosts: string[]
  sandboxHosts:    string[]
  envStatus: {
    testSecret:        boolean
    testPublishable:   boolean
    testWebhookSecret: boolean
    liveSecret:        boolean
    livePublishable:   boolean
    liveWebhookSecret: boolean
  }
  account: null | {
    id:              string
    displayName:     string | null
    country:         string | null
    chargesEnabled:  boolean
    payoutsEnabled:  boolean
    detailsSubmitted: boolean
  }
}

interface Props {
  canWrite: boolean
}

const ENV_LABEL: Record<keyof PaymentSettings['envStatus'], string> = {
  testSecret:        'STRIPE_SECRET_KEY_TEST',
  testPublishable:   'STRIPE_PUBLISHABLE_KEY_TEST',
  testWebhookSecret: 'STRIPE_WEBHOOK_SECRET_TEST',
  liveSecret:        'STRIPE_SECRET_KEY_LIVE',
  livePublishable:   'STRIPE_PUBLISHABLE_KEY_LIVE',
  liveWebhookSecret: 'STRIPE_WEBHOOK_SECRET_LIVE',
}

export function StripePaymentsCard({ canWrite }: Props) {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const { plans } = useMembership()

  // Build a map: Stripe product_id → plan ids that reference it
  // so the catalogue can display "Linked: annual" badges
  const productLinkMap = new Map<string, string[]>()
  if (settings) {
    for (const plan of plans) {
      const productId = settings.mode === 'live' ? plan.stripeProductIdLive : plan.stripeProductIdTest
      if (productId) {
        const existing = productLinkMap.get(productId) ?? []
        existing.push(plan.id)
        productLinkMap.set(productId, existing)
      }
    }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Sign-in required to view payment settings.')
        setLoading(false)
        return
      }
      const res = await fetch('/.netlify/functions/payment-settings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load payment settings.')
      } else {
        setSettings(json)
      }
    } catch (err) {
      console.error('[payment-settings] load error:', err)
      setError('Network error loading payment settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setOverride = async (next: Override) => {
    if (!canWrite || !settings || settings.modeOverride === next) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expired. Please sign in again.')
        return
      }
      const res = await fetch('/.netlify/functions/payment-settings', {
        method:  'PUT',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ modeOverride: next }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to update payment mode.')
        return
      }
      // Invalidate the client-side Stripe.js cache so any subsequent
      // checkout uses the new publishable key.
      resetStripeCache()
      toast.success(`Payment mode set to: ${labelFor(next)}`)
      await load()
    } catch (err) {
      console.error('[payment-settings] save error:', err)
      toast.error('Network error updating payment mode.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="Stripe payments"
      description="Configure live/test mode for donations, memberships and ticket sales. Secret keys are managed in Netlify."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading || saving}
        >
          {loading ? <Spinner className="mr-2 animate-spin" /> : null}
          Refresh
        </Button>
      }
    >
      {loading && !settings ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="animate-spin" />
          Loading Stripe configuration…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : settings ? (
        <div className="space-y-6">
          {/* ── Current mode banner ─────────────────────────────────────── */}
          <div
            className={cn(
              'rounded-xl border p-4 flex items-center gap-4',
              settings.mode === 'live'
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-amber-300 bg-amber-50',
            )}
          >
            <div
              className={cn(
                'rounded-xl p-3',
                settings.mode === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
              )}
            >
              <CreditCard size={22} weight="duotone" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">Current mode:</span>
                <Badge
                  className={cn(
                    'uppercase tracking-wider',
                    settings.mode === 'live'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white',
                  )}
                >
                  {settings.mode}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  via {sourceLabel(settings.source)}
                </span>
              </div>
              {settings.account ? (
                <div className="text-xs text-muted-foreground mt-1">
                  Connected to{' '}
                  <span className="font-mono text-slate-700">{settings.account.id}</span>
                  {settings.account.displayName ? ` · ${settings.account.displayName}` : ''}
                  {settings.account.country ? ` · ${settings.account.country.toUpperCase()}` : ''}
                  {settings.account.chargesEnabled ? '' : ' · ⚠ charges disabled'}
                </div>
              ) : (
                <div className="text-xs text-red-600 mt-1">
                  Could not retrieve Stripe account — secret key may be missing or invalid.
                </div>
              )}
            </div>
          </div>

          {/* ── Mode override radio ─────────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2">Mode resolution</p>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Auto</strong> (recommended) uses the deployment host: production hostnames
              run in live mode, everything else (localhost, deploy previews) runs in test mode.
              The override below lets you force one mode regardless of host — useful for end-to-end
              testing on production-like infrastructure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['auto', 'test', 'live'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={!canWrite || saving}
                  onClick={() => void setOverride(value)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition-all',
                    settings.modeOverride === value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 bg-white hover:border-orange-300',
                    (!canWrite || saving) && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {settings.modeOverride === value ? (
                      <CheckCircle size={16} weight="fill" className="text-orange-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                    )}
                    <span className="font-semibold text-sm text-slate-900">{labelFor(value)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{descriptionFor(value)}</p>
                </button>
              ))}
            </div>
            {settings.modeOverride !== 'auto' && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                <Lightning size={14} weight="fill" className="mt-0.5 shrink-0" />
                <span>
                  Override active: Stripe is forced to <strong>{settings.modeOverride}</strong> mode
                  on every host. Remember to switch back to Auto when finished.
                </span>
              </div>
            )}
          </div>

          {/* ── Environment variables status ────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2">Netlify environment variables</p>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              <Lock size={12} weight="fill" />
              Secret keys never leave Netlify — only their presence/absence is shown here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(Object.keys(ENV_LABEL) as Array<keyof typeof ENV_LABEL>).map((key) => {
                const ok = settings.envStatus[key]
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                      ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
                    )}
                  >
                    {ok ? (
                      <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={16} weight="fill" className="text-red-600 shrink-0" />
                    )}
                    <code className="text-xs font-mono text-slate-700 truncate">
                      {ENV_LABEL[key]}
                    </code>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              To add or rotate a key, open the{' '}
              <a
                href="https://app.netlify.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-orange-700 hover:underline inline-flex items-center gap-0.5"
              >
                Netlify dashboard
                <ArrowSquareOut size={11} />
              </a>{' '}
              → Site settings → Environment variables.
            </p>
          </div>

          {/* ── Sandbox / test hosts ────────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Sandbox / test hosts</p>
            <p className="text-xs text-muted-foreground mb-2">
              These hostnames always run in <strong>test</strong> mode — no real charges.
              Use Stripe test cards here freely.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {settings.sandboxHosts.map((h) => (
                <span key={h} className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-1">{h}</code>
                  <span className="text-xs text-amber-700">Test mode (STRIPE_MODE=test)</span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Production hosts ────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">Production hosts</p>
            <p className="text-xs text-muted-foreground mb-2">
              These hostnames run in <strong>live</strong> mode — real charges processed.
              Override via the <code className="mx-1 font-mono">PRODUCTION_HOSTS</code> env var.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {settings.productionHosts.map((h) => (
                <span key={h} className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-green-50 text-green-800 border border-green-200 rounded px-2 py-1">{h}</code>
                  <span className="text-xs text-green-700">Live mode</span>
                </span>
              ))}
            </div>
          </div>

          {settings.updatedAt && (
            <p className="text-xs text-muted-foreground border-t border-slate-100 pt-3">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}

          {/* ── Product catalogue ──────────────────────────────────────── */}
          <div className="border-t border-slate-100 pt-5">
            <StripeProductCatalogue mode={settings.mode} productLinkMap={productLinkMap} />
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}

function labelFor(o: Override): string {
  return o === 'auto' ? 'Auto (recommended)' : o === 'test' ? 'Force test mode' : 'Force live mode'
}

function descriptionFor(o: Override): string {
  switch (o) {
    case 'auto': return 'Use host detection — production runs live, everywhere else runs test.'
    case 'test': return 'Always use test keys, even on the production domain. No real charges.'
    case 'live': return 'Always use live keys. Real money. Use with caution.'
  }
}

function sourceLabel(s: Source): string {
  switch (s) {
    case 'host':         return 'host detection'
    case 'env-override': return 'STRIPE_MODE environment variable'
    case 'db-override':  return 'admin database override'
  }
}
