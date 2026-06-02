import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/admin/adminUi'
import { StripeProductMapper } from '@/components/admin/sections/StripeProductMapper'
import { ArrowsClockwise, Spinner } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function MembershipPlansSection() {
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test')
  const [syncing, setSyncing] = useState(false)

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

  const handleSyncPlans = async () => {
    setSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expired')
        setSyncing(false)
        return
      }

      const res = await fetch('/.netlify/functions/sync-plans-from-mappings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || 'Failed to sync plans')
        return
      }

      // Build success message
      let message = `Synced ${json.synced} plans from Stripe ${json.mode} mode`
      if (json.deactivated > 0) {
        message += ` (${json.deactivated} deactivated - products deleted/archived in Stripe)`
      }
      toast.success(message)
      
      // Refresh the page to show updated plans
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      console.error('[sync-plans] error:', err)
      toast.error('Network error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stripe Product Mapper */}
      <SectionCard
        title="Stripe Product Mapping"
        description="View all Stripe products and create mappings to your membership plans, donations, special causes, or tickets. All products and prices are fetched directly from your Stripe catalog. After creating mappings, click 'Sync Plans' to update the membership page."
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
              variant="default"
              size="sm"
              onClick={handleSyncPlans}
              disabled={syncing}
              className="gap-1.5"
            >
              {syncing ? (
                <>
                  <Spinner size={14} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowsClockwise size={14} weight="bold" />
                  Sync Plans
                </>
              )}
            </Button>
          </div>
        }
      >
        <StripeProductMapper />
      </SectionCard>
    </div>
  )
}
