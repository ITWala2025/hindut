import { useMemo, useState, useEffect } from 'react'
import {
  Star,
  CheckCircle,
  Warning,
  Spinner,
  Link,
  Storefront,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/admin/adminUi'
import { StripeProductMapper } from '@/components/admin/sections/StripeProductMapper'

import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { MEMBERSHIP_CATALOG, type StripeCatalogPlan } from '@/data/stripeCatalogMapping'

/**
 * Shows which Stripe modes have been configured for a plan.
 * Green badge = catalog Price ID exists for that mode.
 */
function StripeLinkBadge({ plan, mode }: { plan: StripeCatalogPlan; mode: 'test' | 'live' }) {
  const hasTest = !!plan.stripe.test.priceId
  const hasLive = !!plan.stripe.live.priceId
  
  if (mode === 'test') {
    return hasTest ? (
      <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 gap-0.5">
        <CheckCircle size={9} weight="fill" />TEST
      </Badge>
    ) : (
      <Badge className="text-[10px] bg-slate-100 text-slate-400 border-slate-200 gap-0.5">
        <Warning size={9} weight="fill" />Not set
      </Badge>
    )
  }
  
  return hasLive ? (
    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 gap-0.5">
      <CheckCircle size={9} weight="fill" />LIVE
    </Badge>
  ) : (
    <Badge className="text-[10px] bg-slate-100 text-slate-400 border-slate-200 gap-0.5">
      <Warning size={9} weight="fill" />Not set
    </Badge>
  )
}

export function MembershipPlansSection() {
  const { can } = useAuth()
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test')
  const [loading, setLoading] = useState(true)

  const sortedPlans = useMemo(
    () => [...MEMBERSHIP_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder),
    [],
  )

  // Fetch current Stripe mode
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const res = await fetch('/.netlify/functions/payment-config')
        if (res.ok) {
          const json = await res.json() as { mode: 'test' | 'live' }
          setCurrentMode(json.mode)
        }
      } catch (err) {
        console.error('Failed to fetch payment mode:', err)
      } finally {
        setLoading(false)
      }
    }
    void fetchMode()
  }, [])

  return (
    <div className="space-y-4">
      <SectionCard
        title="Membership Plans"
        description="Plans are managed via Stripe product catalog. Map Stripe prices to your membership tiers below."
        actions={
          <div className="flex items-center gap-2">
            <Badge
              className={`uppercase tracking-wider ${
                currentMode === 'live' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {currentMode} mode
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
              title="Refresh"
            >
              {loading ? <Spinner size={14} className="animate-spin" /> : <ArrowsClockwise size={14} />}
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Cadence</th>
                <th className="py-2 pr-3 font-medium">Price</th>
                <th className="py-2 pr-3 font-medium">Stripe Status</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlans.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      {p.popular && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Star size={10} weight="fill" /> Popular
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{p.id}</div>
                  </td>
                  <td className="py-2 pr-3 capitalize">{p.category}</td>
                  <td className="py-2 pr-3 capitalize">{p.cadence.replace('_', '-')}</td>
                  <td className="py-2 pr-3">
                    {p.id === 'custom' ? (
                      <span className="text-xs text-slate-500">User specified</span>
                    ) : (
                      `€${p.price}`
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <StripeLinkBadge plan={p} mode="test" />
                      <StripeLinkBadge plan={p} mode="live" />
                    </div>
                    {p.stripe[currentMode].priceId && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {p.stripe[currentMode].priceId}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {p.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Stripe Product Mapper */}
      <SectionCard
        title="Stripe Product Mapping"
        description="View all Stripe products and map them to your membership plans, donations, special causes, or tickets."
      >
        <StripeProductMapper />
      </SectionCard>
    </div>
  )
}
