/**
 * src/components/pages/ActivateRolePage.tsx
 *
 * Landing page for the role-activation flow.
 *
 * Two entry points:
 *  1. Invite (new user) — Supabase sends an invite email whose magic link
 *     redirects here after auth with ?token=<our_token>
 *  2. Role-change (existing user) — admin sends a role-change email whose
 *     link goes directly to /activate-role?token=<token>
 *
 * In both cases this page calls /.netlify/functions/activate-role?token=...
 * and shows the result.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Spinner } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SeoMeta } from '@/lib/seo'

type Status = 'loading' | 'success' | 'error'

export function ActivateRolePage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [status,  setStatus]  = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const [role,    setRole]    = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setMessage('No activation token found in the link. Please check your email and try again.')
      return
    }

    fetch(`/.netlify/functions/activate-role?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json()
        if (json.ok) {
          setRole(json.role ?? '')
          setStatus('success')
        } else {
          setStatus('error')
          setMessage(json.error ?? 'Activation failed. Please contact an administrator.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Network error. Please try again.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const roleLabel =
    role === 'super_admin' ? 'Super Admin'
    : role === 'admin'     ? 'Admin'
    : role === 'editor'    ? 'Editor'
    : ''

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <SeoMeta
        title="Activate Account"
        description="Activate your Hindu Association of Ireland admin account."
        noIndex
      />
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        {/* Logo / brand */}
        <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-6">
          Hindu Association of Ireland
        </p>

        {status === 'loading' && (
          <>
            <Spinner size={48} className="text-orange-500 animate-spin mx-auto mb-4" weight="bold" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Activating your account…</h1>
            <p className="text-sm text-muted-foreground">This will only take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={56} className="text-green-500 mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Activated!</h1>
            {roleLabel && (
              <p className="text-base text-slate-600 mb-1">
                Your <span className="font-semibold text-orange-600">{roleLabel}</span> role is now active.
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-8">
              You can now sign in to the admin portal. A confirmation email has been sent to you.
            </p>
            <Button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold w-full"
            >
              Go to Admin Portal
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={56} className="text-red-500 mx-auto mb-4" weight="fill" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Activation Failed</h1>
            <p className="text-sm text-muted-foreground mb-8">{message}</p>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Homepage
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
