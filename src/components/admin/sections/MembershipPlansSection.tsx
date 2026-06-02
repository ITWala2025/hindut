import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/admin/adminUi'
import { StripeProductMapper } from '@/components/admin/sections/StripeProductMapper'

export function MembershipPlansSection() {
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test')

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
      }
    }
    void fetchMode()
  }, [])

  return (
    <div className="space-y-4">
      {/* Stripe Product Mapper */}
      <SectionCard
        title="Stripe Product Mapping"
        description="View all Stripe products and create mappings to your membership plans, donations, special causes, or tickets. All products and prices are fetched directly from your Stripe catalog."
        actions={
          <Badge
            className={`uppercase tracking-wider ${
              currentMode === 'live' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            {currentMode} mode
          </Badge>
        }
      >
        <StripeProductMapper />
      </SectionCard>
    </div>
  )
}
