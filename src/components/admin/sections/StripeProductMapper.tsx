/**
 * StripeProductMapper.tsx
 *
 * Admin UI for viewing all Stripe products/prices and mapping them to
 * application entities (memberships, donations, special causes, tickets).
 */

import { useState, useEffect } from 'react'
import {
  Storefront,
  Spinner,
  Warning,
  ArrowsClockwise,
  Link,
  Trash,
  Plus,
  CheckCircle,
  XCircle,
  Tag,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

interface StripePrice {
  id: string
  nickname: string | null
  currency: string
  unit_amount: number | null
  type: 'one_time' | 'recurring'
  recurring: { interval: string; interval_count: number } | null
  active: boolean
}

interface StripeProduct {
  id: string
  name: string
  description: string | null
  active: boolean
  metadata: Record<string, string>
  created: number
  prices: StripePrice[]
}

interface Mapping {
  id: string
  stripe_product_id: string
  stripe_price_id: string
  stripe_mode: 'test' | 'live'
  entity_type: 'membership' | 'donation' | 'special_cause' | 'ticket'
  entity_id: string
  product_name: string
  price_amount: number | null
  price_currency: string
  price_interval: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MappingFormData {
  entity_type: 'membership' | 'donation' | 'special_cause' | 'ticket'
  entity_id: string
}

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return 'Free'
  const formatted = (amount / 100).toFixed(2)
  return `${currency.toUpperCase()} ${formatted}`
}

function formatInterval(interval: string | null, intervalCount: number | null): string {
  if (!interval) return 'One-time'
  const count = intervalCount || 1
  if (count === 1) return `per ${interval}`
  return `every ${count} ${interval}s`
}

function MappingDialog({
  product,
  price,
  mode,
  existingMapping,
  onMappingCreated,
}: {
  product: StripeProduct
  price: StripePrice
  mode: 'test' | 'live'
  existingMapping?: Mapping
  onMappingCreated: () => void
}) {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<MappingFormData>({
    entity_type: existingMapping?.entity_type || 'membership',
    entity_id: existingMapping?.entity_id || '',
  })

  const canMap = can('settings:update') || can('settings:create')

  const handleSubmit = async () => {
    if (!formData.entity_id.trim()) {
      toast.error('Please enter an Entity ID')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expired. Please sign in again.')
        return
      }

      const method = existingMapping ? 'PUT' : 'POST'
      const body = existingMapping
        ? { id: existingMapping.id, ...formData }
        : {
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            stripe_mode: mode,
            product_name: product.name,
            price_amount: price.unit_amount,
            price_currency: price.currency,
            price_interval: price.recurring?.interval || null,
            ...formData,
          }

      const res = await fetch('/.netlify/functions/stripe-mappings', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || 'Failed to save mapping')
        return
      }

      toast.success(existingMapping ? 'Mapping updated' : 'Mapping created')
      setOpen(false)
      onMappingCreated()
    } catch (err) {
      console.error('[mapping-dialog] error:', err)
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={existingMapping ? 'outline' : 'default'}
          disabled={!canMap}
          className={cn(
            'gap-1.5',
            existingMapping
              ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
              : 'bg-orange-600 hover:bg-orange-700 text-white',
          )}
        >
          {existingMapping ? (
            <>
              <Link size={14} weight="bold" />
              Edit mapping
            </>
          ) : (
            <>
              <Plus size={14} weight="bold" />
              Map
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map Stripe Price to Application</DialogTitle>
          <DialogDescription>
            Connect this Stripe price to a membership plan, donation type, special cause, or ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Stripe info */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="font-semibold text-slate-900">{product.name}</div>
            <div className="text-slate-600 text-xs mt-0.5">
              {formatPrice(price.unit_amount, price.currency)}{' '}
              {formatInterval(price.recurring?.interval || null, price.recurring?.interval_count || null)}
            </div>
            <div className="font-mono text-[10px] text-slate-400 mt-1">{price.id}</div>
          </div>

          {/* Entity type */}
          <div>
            <Label htmlFor="entity_type">Entity Type</Label>
            <Select
              value={formData.entity_type}
              onValueChange={(value: any) => setFormData({ ...formData, entity_type: value })}
            >
              <SelectTrigger id="entity_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membership">Membership Plan</SelectItem>
                <SelectItem value="donation">Donation Type</SelectItem>
                <SelectItem value="special_cause">Special Cause</SelectItem>
                <SelectItem value="ticket">Event Ticket</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Where this price will be used in your application
            </p>
          </div>

          {/* Entity ID */}
          <div>
            <Label htmlFor="entity_id">Entity ID</Label>
            <Input
              id="entity_id"
              value={formData.entity_id}
              onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
              placeholder={
                formData.entity_type === 'membership'
                  ? 'e.g., bronze, silver, gold'
                  : formData.entity_type === 'donation'
                    ? 'e.g., general, building_fund'
                    : formData.entity_type === 'special_cause'
                      ? 'e.g., cause_id'
                      : 'e.g., event_id'
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.entity_type === 'membership' &&
                'The plan ID from your membership configuration (e.g., "bronze", "silver")'}
              {formData.entity_type === 'donation' && 'The donation type ID'}
              {formData.entity_type === 'special_cause' && 'The special cause ID from your database'}
              {formData.entity_type === 'ticket' && 'The event ID or ticket type'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Spinner size={14} className="mr-2 animate-spin" /> : null}
              {existingMapping ? 'Update' : 'Create'} Mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function StripeProductMapper() {
  const { can } = useAuth()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [mode, setMode] = useState<'test' | 'live'>('test')
  const [error, setError] = useState<string | null>(null)

  const canDelete = can('settings:delete')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Sign-in required')
        setLoading(false)
        return
      }

      const res = await fetch('/.netlify/functions/stripe-mappings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to load data')
        return
      }

      setMode(json.mode)
      setProducts(json.products || [])
      setMappings(json.mappings || [])
    } catch (err) {
      console.error('[stripe-product-mapper] error:', err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expired')
        return
      }

      const res = await fetch(`/.netlify/functions/stripe-mappings?id=${mappingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error || 'Failed to delete mapping')
        return
      }

      toast.success('Mapping deleted')
      await load()
    } catch (err) {
      console.error('[stripe-product-mapper] delete error:', err)
      toast.error('Network error')
    }
  }

  const getMappingForPrice = (priceId: string): Mapping | undefined => {
    return mappings.find((m) => m.stripe_price_id === priceId)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Spinner className="animate-spin" />
        Loading Stripe products…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
        <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Storefront size={20} weight="duotone" className="text-orange-600" />
          <h3 className="text-sm font-semibold text-slate-900">Stripe Product Catalog</h3>
          <Badge
            className={cn(
              'uppercase tracking-wider ml-2',
              mode === 'live' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
            )}
          >
            {mode} mode
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <ArrowsClockwise size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Products list */}
      {products.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <Storefront size={32} className="text-slate-400 mx-auto mb-2" weight="duotone" />
          <p className="text-sm text-slate-600">No products found in Stripe {mode} mode</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create products in your Stripe Dashboard first
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{product.name}</h4>
                    {product.active ? (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-400">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-xs text-slate-600 mt-0.5">{product.description}</p>
                  )}
                  <p className="text-[10px] font-mono text-slate-400 mt-1">{product.id}</p>
                </div>
              </div>

              {/* Prices */}
              <div className="space-y-2">
                {product.prices.map((price) => {
                  const mapping = getMappingForPrice(price.id)
                  return (
                    <div
                      key={price.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        mapping
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-slate-50 border-slate-200',
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {formatPrice(price.unit_amount, price.currency)}
                          </span>
                          <span className="text-xs text-slate-600">
                            {formatInterval(price.recurring?.interval || null, price.recurring?.interval_count || null)}
                          </span>
                          {price.nickname && (
                            <Badge variant="outline" className="text-[10px]">
                              {price.nickname}
                            </Badge>
                          )}
                          {!price.active && (
                            <Badge variant="outline" className="text-[10px] text-slate-400">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {mapping && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Tag size={12} className="text-orange-600" weight="fill" />
                            <span className="text-xs text-orange-700">
                              Mapped to{' '}
                              <strong className="font-mono">{mapping.entity_type}</strong>:{' '}
                              <strong className="font-mono">{mapping.entity_id}</strong>
                            </span>
                          </div>
                        )}
                        <p className="text-[10px] font-mono text-slate-400 mt-1">{price.id}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <MappingDialog
                          product={product}
                          price={price}
                          mode={mode}
                          existingMapping={mapping}
                          onMappingCreated={load}
                        />
                        {mapping && canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteMapping(mapping.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
