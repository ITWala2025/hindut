/**
 * StripeProductCatalogue.tsx
 *
 * Fetches the Stripe product catalogue via /.netlify/functions/stripe-products
 * and renders it as a collapsible list inside the Stripe settings section.
 * Products that are linked to a membership plan show a "Linked: <planId>" badge.
 */
import { useState } from 'react'
import {
  Storefront,
  Spinner,
  Warning,
  ArrowsClockwise,
  Tag,
  CheckCircle,
  XCircle,
  CaretDown,
  CaretRight,
  Link,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface StripePrice {
  id:       string
  nickname: string | null
  currency: string
  amount:   number | null
  type:     'one_time' | 'recurring'
  interval: string | null
  active:   boolean
}

interface StripeProduct {
  id:          string
  name:        string
  description: string | null
  active:      boolean
  images:      string[]
  metadata:    Record<string, string>
  created:     number
  prices:      StripePrice[]
}

interface CatalogueResponse {
  mode:     'test' | 'live'
  products: StripeProduct[]
}

/** Map from Stripe product_id → plan id(s) that reference it */
type ProductLinkMap = Map<string, string[]>

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return 'Usage-based'
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function PriceRow({ price }: { price: StripePrice }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm border',
      price.active ? 'border-slate-100 bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-50',
    )}>
      <Tag size={14} className="text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-slate-800">
          {formatAmount(price.amount, price.currency)}
        </span>
        {price.interval && (
          <span className="text-muted-foreground ml-1">/ {price.interval}</span>
        )}
        {price.nickname && (
          <span className="text-muted-foreground ml-2 text-xs">"{price.nickname}"</span>
        )}
        <span className="text-xs text-slate-400 ml-2 font-mono">{price.id}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge
          className={cn(
            'text-xs',
            price.type === 'recurring'
              ? 'bg-blue-100 text-blue-700 border-blue-200'
              : 'bg-slate-100 text-slate-600 border-slate-200',
          )}
        >
          {price.type === 'recurring' ? 'Recurring' : 'One-time'}
        </Badge>
        {!price.active && (
          <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200">Archived</Badge>
        )}
      </div>
    </div>
  )
}

function ProductRow({ product, linkedPlanIds }: { product: StripeProduct; linkedPlanIds: string[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      'rounded-xl border',
      product.active ? 'border-slate-200' : 'border-slate-200 opacity-60',
    )}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors rounded-xl"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <CaretDown size={14} className="text-slate-400 shrink-0" />
        ) : (
          <CaretRight size={14} className="text-slate-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm truncate">{product.name}</span>
            {product.active ? (
              <CheckCircle size={14} weight="fill" className="text-emerald-500 shrink-0" />
            ) : (
              <XCircle size={14} weight="fill" className="text-slate-400 shrink-0" />
            )}
            {linkedPlanIds.map((planId) => (
              <Badge key={planId} className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 gap-0.5">
                <Link size={9} /> {planId}
              </Badge>
            ))}
          </div>
          {product.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{product.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{product.prices.length} price{product.prices.length !== 1 ? 's' : ''}</span>
          <span className="font-mono text-xs text-slate-400">{product.id}</span>
          {!product.active && (
            <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200">Archived</Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}
          {Object.keys(product.metadata).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(product.metadata).map(([k, v]) => (
                <span key={k} className="text-xs font-mono bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
          {product.prices.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No prices attached.</p>
          ) : (
            <div className="space-y-1.5">
              {product.prices.map((p) => (
                <PriceRow key={p.id} price={p} />
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 pt-1">
            Created: {new Date(product.created * 1000).toLocaleDateString('en-IE')}
          </p>
        </div>
      )}
    </div>
  )
}

interface Props {
  mode: 'test' | 'live'
  /** Map of Stripe product_id → linked plan ids (from membership_plans) */
  productLinkMap?: ProductLinkMap
}

export function StripeProductCatalogue({ mode, productLinkMap }: Props) {
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [data, setData]       = useState<CatalogueResponse | null>(null)

  const fetch_ = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Sign-in required.')
        return
      }
      const res = await fetch('/.netlify/functions/stripe-products', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to load product catalogue.')
      } else {
        setData(json as CatalogueResponse)
        setLoaded(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Storefront size={16} weight="duotone" className="text-orange-600" />
          <p className="text-sm font-semibold text-slate-900">Product catalogue</p>
          <Badge
            className={cn(
              'text-xs uppercase tracking-wider',
              mode === 'live' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
            )}
          >
            {mode}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetch_()}
          disabled={loading}
        >
          {loading ? (
            <Spinner size={14} className="mr-1.5 animate-spin" />
          ) : (
            <ArrowsClockwise size={14} className="mr-1.5" />
          )}
          {loaded ? 'Refresh' : 'Load catalogue'}
        </Button>
      </div>

      {!loaded && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          Click "Load catalogue" to fetch products and prices from Stripe.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Spinner className="animate-spin" size={16} />
          Fetching from Stripe…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            {data.products.length} product{data.products.length !== 1 ? 's' : ''} found
            ({data.products.filter((p) => p.active).length} active).
            Click a row to expand prices.
          </p>
          {data.products.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No products found in your Stripe {data.mode} account.
            </p>
          ) : (
            <div className="space-y-2">
              {data.products.map((p) => (
                <ProductRow key={p.id} product={p} linkedPlanIds={productLinkMap?.get(p.id) ?? []} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
