import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, Gear, ShieldCheck, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import type { CookieCategoryState } from '@/lib/cookieConsent'
import { COOKIE_CONSENT_TTL_DAYS } from '@/lib/cookieConsent'

/**
 * Bottom-anchored cookie consent banner + preferences dialog.
 *
 *   - Appears for any visitor with no stored consent (or expired consent).
 *   - "Accept all" / "Reject all" / "Preferences" buttons.
 *   - Choice is persisted in localStorage for 365 days.
 *   - Listens for `open-cookie-preferences` window event so the footer
 *     "Cookie Preferences" link can reopen the dialog at any time.
 */

/** Custom window event the Footer dispatches to reopen the preferences dialog. */
export const OPEN_COOKIE_PREFERENCES_EVENT = 'open-cookie-preferences'

interface CategoryDef {
  id:          keyof CookieCategoryState
  title:       string
  description: string
  required?:   boolean
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id:          'necessary',
    title:       'Strictly necessary',
    description:
      'Required for the site to function: keeping you signed in, remembering ' +
      'your form selections, securing payment flows, and providing CSRF / ' +
      'session protection. These cannot be turned off.',
    required:    true,
  },
  {
    id:          'functional',
    title:       'Functional',
    description:
      'Remember preferences that improve your experience — e.g. dialog state, ' +
      'last-visited section, language selection. No personally identifying ' +
      'information is shared.',
  },
  {
    id:          'analytics',
    title:       'Analytics',
    description:
      'Privacy-first first-party measurement of page views, time on page and ' +
      'aggregated geography. IP addresses are hashed server-side; we never ' +
      'sell or share this data.',
  },
  {
    id:          'marketing',
    title:       'Marketing',
    description:
      'Cookies used by advertising or social-media partners to measure ad ' +
      'effectiveness. We do not currently set any marketing cookies; the ' +
      'toggle is provided for transparency.',
  },
]

export function CookieConsentBanner() {
  const { consent, hasConsented, acceptAll, rejectAll, saveCustom } = useCookieConsent()
  const [prefsOpen, setPrefsOpen] = useState(false)

  // Listen for "open preferences" requests from anywhere in the app.
  useEffect(() => {
    const handler = () => setPrefsOpen(true)
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler)
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler)
  }, [])

  // Banner is shown only when the visitor has not yet expressed a choice.
  const showBanner = !hasConsented

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-60 px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-5xl rounded-2xl border border-orange-200/70 bg-white/95 backdrop-blur-md shadow-xl shadow-orange-900/10 ring-1 ring-orange-100/60">
            <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:gap-6">
              <div className="flex items-start gap-3 md:flex-1">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                  <Cookie size={22} weight="duotone" />
                </div>
                <div className="text-sm leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900">We value your privacy</p>
                  <p className="mt-1">
                    We use strictly-necessary cookies to keep the site running, plus
                    optional cookies for analytics and preferences. You can accept all,
                    reject all, or pick which ones to allow. Your choice is stored for{' '}
                    <span className="font-medium">365&nbsp;days</span>. See our{' '}
                    <Link
                      to="/cookies-policy"
                      className="text-orange-700 underline underline-offset-2 hover:text-orange-800"
                    >
                      Cookies Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:items-center md:justify-end md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-300 text-orange-800 hover:bg-orange-50"
                  onClick={() => setPrefsOpen(true)}
                >
                  <Gear size={16} weight="bold" className="mr-1.5" />
                  Preferences
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => rejectAll()}
                >
                  Reject all
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-600 text-white hover:bg-orange-700"
                  onClick={() => acceptAll()}
                >
                  Accept all
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CookiePreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        initial={consent?.categories}
        onSave={(cats) => {
          saveCustom(cats)
          setPrefsOpen(false)
        }}
        onAcceptAll={() => {
          acceptAll()
          setPrefsOpen(false)
        }}
        onRejectAll={() => {
          rejectAll()
          setPrefsOpen(false)
        }}
      />
    </>
  )
}

interface PreferencesDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  initial?:     CookieCategoryState
  onSave:       (categories: CookieCategoryState) => void
  onAcceptAll:  () => void
  onRejectAll:  () => void
}

function CookiePreferencesDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  onAcceptAll,
  onRejectAll,
}: PreferencesDialogProps) {
  const defaults = useMemo<CookieCategoryState>(
    () => ({
      necessary:  true,
      functional: initial?.functional ?? false,
      analytics:  initial?.analytics  ?? false,
      marketing:  initial?.marketing  ?? false,
    }),
    [initial?.functional, initial?.analytics, initial?.marketing],
  )
  const [draft, setDraft] = useState<CookieCategoryState>(defaults)

  // Re-sync local draft whenever the dialog (re)opens or the stored consent changes.
  useEffect(() => {
    if (open) setDraft(defaults)
  }, [open, defaults])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
              <ShieldCheck size={20} weight="duotone" />
            </div>
            <DialogTitle>Cookie preferences</DialogTitle>
          </div>
          <DialogDescription>
            Choose which cookies you allow. Strictly necessary cookies are always on
            because the site relies on them. Your choice is stored locally on this
            device for {COOKIE_CONSENT_TTL_DAYS} days and you can change it anytime
            from the footer.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-3">
            {CATEGORY_DEFS.map((cat) => {
              const checked = cat.required ? true : !!draft[cat.id]
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{cat.title}</h3>
                        {cat.required && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {cat.description}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      disabled={cat.required}
                      onCheckedChange={(value) => {
                        if (cat.required) return
                        setDraft((d) => ({ ...d, [cat.id]: value }))
                      }}
                      aria-label={`${cat.title} cookies`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700"
              onClick={onRejectAll}
            >
              Reject all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-800 hover:bg-orange-50"
              onClick={onAcceptAll}
            >
              Accept all
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-600"
            >
              <X size={16} weight="bold" className="mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => onSave(draft)}
            >
              Save preferences
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Convenience helper: dispatches the open-preferences event. Used by the
 * footer's "Cookie Preferences" link.
 */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))
}
