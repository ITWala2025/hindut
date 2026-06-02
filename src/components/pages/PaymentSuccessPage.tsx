import { Link, useLocation } from 'react-router-dom'
import { CheckCircle, House, Heart, Ticket, Users, Baby, CalendarBlank } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SeoMeta } from '@/lib/seo'

interface PaymentSuccessPageProps {
  variant: 'donation' | 'membership' | 'ticket'
}

export function PaymentSuccessPage({ variant }: PaymentSuccessPageProps) {
  const search = new URLSearchParams(useLocation().search)
  const monthlyEur = (() => {
    const val = parseFloat(search.get('monthly_eur') ?? '')
    return !isNaN(val) && val > 0 ? val : null
  })()

  // Ticket params (passed by finaliseBooking in TicketBookingDialog)
  const name       = search.get('name')
  const eventTitle = search.get('event')
  const amount     = search.get('amount')
  const adults     = search.get('adults')
  const children   = search.get('children')

  // ── Ticket confirmation ──────────────────────────────────────────────────
  if (variant === 'ticket') {
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
            Booking Confirmed!
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Your tickets have been booked and a confirmation email is on its way.
          </p>

          {/* Booking summary card */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-left space-y-3">
            {eventTitle && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarBlank size={15} className="text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-900">{decodeURIComponent(eventTitle)}</span>
              </div>
            )}
            {name && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Users size={15} className="text-amber-600 shrink-0" />
                <span>Booked for <strong>{decodeURIComponent(name)}</strong></span>
              </div>
            )}
            {(adults || children) && (
              <div className="flex items-center gap-4 text-sm text-slate-600">
                {adults && Number(adults) > 0 && (
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-amber-500" />
                    {adults} Adult{Number(adults) !== 1 ? 's' : ''}
                  </span>
                )}
                {children && Number(children) > 0 && (
                  <span className="flex items-center gap-1">
                    <Baby size={13} className="text-amber-500" />
                    {children} Child{Number(children) !== 1 ? 'ren' : ''}
                  </span>
                )}
              </div>
            )}
            {amount && (
              <div className="flex justify-between text-sm border-t border-amber-200 pt-3 mt-1">
                <span className="text-slate-600">Amount paid</span>
                <span className="font-bold text-amber-900">EUR {Number(amount).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold">
              <Link to="/events">
                <Ticket weight="fill" className="mr-2" />
                Browse More Events
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              <Link to="/">Return Home</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-4 border-t border-orange-100">
            Om Shanti - May you be blessed with peace and prosperity.
          </p>
        </div>
      </section>
    )
  }

  // ── Donation / Membership confirmation ───────────────────────────────────
  const COPY = {
    donation: {
      title: 'Thank you for your donation!',
      body:  'Your contribution helps fund our weekly satsangs, community prayers and the long-term goal of establishing a permanent Hindu Temple in Limerick.',
      cta:   'Back to Home',
      ctaTo: '/',
    },
    membership: {
      title: 'Welcome to the Hindu Association of Ireland!',
      body:  "Your membership is being activated. A receipt has been emailed to you, and you'll receive a member welcome pack shortly.",
      cta:   'View Events',
      ctaTo: '/events',
    },
  } as const

  const copy = COPY[variant as 'donation' | 'membership']

  return (
    <section className="min-h-[70vh] flex items-center justify-center bg-linear-to-br from-orange-50 via-amber-50 to-white px-6 py-16">
      <SeoMeta
        title="Payment Successful"
        description="Your payment was processed successfully. Thank you for supporting the Hindu Association of Ireland."
        noIndex
      />
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

        {variant === 'membership' && monthlyEur && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-left space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Heart weight="fill" size={16} className="text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-900">Monthly contribution added</span>
            </div>
            <p className="text-sm text-amber-800 leading-relaxed">
              Your <strong>€{monthlyEur}/month</strong> contribution will begin on the
              <strong> 1st of next month</strong> and continue monthly until cancelled.
              No charge today.
            </p>
            <p className="text-xs text-amber-600">
              You will receive a reminder email 3 days before each charge.
            </p>
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
          Om Shanti - May you be blessed with peace and prosperity.
        </p>
      </div>
    </section>
  )
}

