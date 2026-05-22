import { useCallback, useEffect, useState } from 'react'
import {
  type CookieConsent,
  type CookieCategoryState,
  acceptAll  as acceptAllStore,
  rejectAll  as rejectAllStore,
  resetConsent as resetConsentStore,
  saveCustom as saveCustomStore,
  getConsent,
  subscribeConsent,
} from '@/lib/cookieConsent'

/**
 * Reactive React hook wrapping the cookie-consent store. Re-renders when
 * the user (or another tab) updates their choice.
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(() => getConsent())

  useEffect(() => {
    // Resync on mount in case the value changed between SSR and hydration
    // (this site is SPA-only, but it's still cheap insurance).
    setConsent(getConsent())
    return subscribeConsent((next) => setConsent(next))
  }, [])

  const acceptAll  = useCallback(() => setConsent(acceptAllStore()), [])
  const rejectAll  = useCallback(() => setConsent(rejectAllStore()), [])
  const saveCustom = useCallback(
    (categories: Partial<CookieCategoryState>) => setConsent(saveCustomStore(categories)),
    [],
  )
  const reset = useCallback(() => {
    resetConsentStore()
    setConsent(null)
  }, [])

  return {
    consent,
    hasConsented: consent !== null,
    acceptAll,
    rejectAll,
    saveCustom,
    reset,
  }
}
