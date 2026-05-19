/**
 * PaymentSuccessPage.tsx
 *
 * Lightweight thank-you page rendered after Stripe redirects the user back
 * to our site (for Checkout Sessions and for redirect-based Payment Intent
 * methods such as 3DS challenges).
 *
 * Stripe appends either `?session_id=cs_…` (Checkout) or
 * `?payment_intent=pi_…&payment_intent_client_secret=…&redirect_status=…`
 * (Payment Intent).  We just show a friendly confirmation and direct the
 * user back into the site — the webhook is the canonical source of truth
 * for marking the donation / booking / membership as paid in the database.
 */
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle, House, Heart } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface PaymentSuccessPageProps {
  variant: 'donation' | 'membership' | 'ticket'
}

const COPY = {
  donation: {
    title:    'Thank you for your donation!',
    body:     'Your contribution helps fund our weekly satsangs, community prayers and the long-term goal of establishing a permanent Hindu Temple in Limerick.',
    cta:      'Back to Home',
    ctaTo:    '/',
  },
  membership: {
    title:    'Welcome to the Hindu Association of Ireland!',
    body:     'Your membership is being activated. A receipt has been emailed to you, and you’ll receive a member welcome pack shortly.',
    cta:      'View Events',
    ctaTo:    '/events',
  },
  ticket: {
    title:    'Booking confirmed!',
    body:     'Your event ticket has been booked. A confirmation email with your booking reference has been sent to you.',
    cta:      'Browse Events',
    ctaTo:    '/events',
  },
} as const

export function PaymentSuccessPage({ variant }: PaymentSuccessPageProps) {
  const search = new URLSearchParams(useLocation().search)
  const reference =
    search.get('session_id') ??
    search.get('payment_intent') ??
    null

  const copy = COPY[variant]

  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-linear-to-br from-orange-50 via-amber-50 to-white px-6 py-16">
      <div className="max-w-xl w-full rounded-3xl bg-white/90 backdrop-blur border border-orange-200 shadow-xl p-8 md:p-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-linear-to-br from-orange-100 to-amber-100 p-6 glow-saffron-intense">
            <CheckCircle size={64} weight="fill" className="text-orange-600" />
          </div>
        </div>
        <h1
          className="text-3xl md:text-4xl font-bold text-orange-800"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {copy.title}
        </h1>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          {copy.body}
        </p>
        {reference && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 text-sm">
            <p className="text-xs text-orange-700 uppercase tracking-widest mb-1">
              Reference
            </p>
            <p className="font-mono text-orange-800 break-all">{reference}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold">
            <Link to={copy.ctaTo}>
              {variant === 'donation' ? (
                <Heart weight="fill" className="mr-2" />
              ) : (
                <House weight="fill" className="mr-2" />
              )}
              {copy.cta}
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            <Link to="/">Return Home</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-4 border-t border-orange-100">
          Om Shanti 🙏 — May you be blessed with peace and prosperity.
        </p>
      </div>
    </section>
  )
}
