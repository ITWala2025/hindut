import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Publicly readable trust/charity ID shown under the org name in the header.
 * Managed by admins in Settings → Organisation profile.
 */
export function useTrustId() {
  const [trustId, setTrustId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('site_settings')
      .select('trust_id')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('[useTrustId] failed to load site settings:', error.message)
          return
        }
        setTrustId((data as { trust_id?: string | null } | null)?.trust_id ?? null)
      })
    return () => {
      active = false
    }
  }, [])

  return trustId
}
