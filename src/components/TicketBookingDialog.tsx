/**
 * TicketBookingDialog.tsx
 * Two-step modal for paid event ticket booking:
 *   Step 1 – Attendee details (same fields as RsvpDialog)
 *   Step 2 – Stripe Payment Element (embedded card form)
 *   Step 3 – Success / booking confirmation
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { Stripe as StripeJs, StripeElementsOptions } from '@stripe/stripe-js'
import { getStripe } from '@/lib/stripeClient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Ticket,
  ArrowRight,
  ArrowLeft,
  Spinner,
  User,
  Phone,
  Envelope,
  Users,
  Baby,
  Warning,
  CreditCard,
  CalendarBlank,
  MapPin,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TempleEvent } from '@/data/events'

// ---------------------------------------------------------------------------
// Validation schema — mirrors RsvpDialog schema exactly
// ---------------------------------------------------------------------------
const detailsSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100)
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100)
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Last name contains invalid characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+[1-9]\d{1,14}$/, 'Enter in E.164 format, e.g. +353851234567'),
  email: z
    .string()
    .min(1, 'Email address is required')
    .max(254)
    .email('Enter a valid email address'),
  numAdults: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(1, 'At least 1 adult required')
    .max(20, 'Maximum 20 adults per booking'),
  numChildren: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(0)
    .max(20, 'Maximum 20 children per booking')
    .optional()
    .default(0),
  consentGdpr: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the data processing terms' }),
  }),
})

type DetailsFormData = z.infer<typeof detailsSchema>

type Step = 'details' | 'payment'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600" role="alert">
      <Warning size={12} weight="fill" />
      {message}
    </p>
  )
}


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface TicketBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: TempleEvent
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TicketBookingDialog({ open, onOpenChange, event }: TicketBookingDialogProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('details')
  const [formSnapshot, setFormSnapshot] = useState<DetailsFormData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Stripe state for the embedded Payment Element.
  const [stripePromise, setStripePromise] = useState<Promise<StripeJs | null> | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const adultPrice = event.price ?? 0
  const childPrice = 0 // children free

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    mode: 'onChange',
    defaultValues: { numAdults: 1, numChildren: 0 },
  })

  const numAdults   = watch('numAdults') || 1
  const numChildren = watch('numChildren') || 0
  const consentValue = watch('consentGdpr')

  const total = (Number(numAdults) * adultPrice) + (Number(numChildren) * childPrice)

  const handleClose = (v: boolean) => {
    if (!v) {
      setTimeout(() => {
        reset()
        setStep('details')
        setFormSnapshot(null)
        setClientSecret(null)
        setPaymentIntentId(null)
        setPaymentError(null)
      }, 300)
    }
    onOpenChange(v)
  }

  // Step 1 → Step 2: snapshot the form, persist to sessionStorage (for Revolut Pay
  //   redirect recovery), then request a PaymentIntent so the Payment Element mounts.
  const onDetailsSubmit = async (data: DetailsFormData) => {
    setFormSnapshot(data)
    // Persist so /ticket-success can finalise booking after a Revolut/wallet redirect
    const amountEur = (data.numAdults * adultPrice) + ((data.numChildren ?? 0) * childPrice)
    sessionStorage.setItem('ticket_booking_pending', JSON.stringify({
      eventId:     event.id,
      firstName:   data.firstName,
      lastName:    data.lastName,
      phone:       data.phone,
      email:       data.email,
      numAdults:   data.numAdults,
      numChildren: data.numChildren ?? 0,
      amountEur,
      consentGdpr: true,
      eventTitle:  event.title,
      eventDate:   event.date,
    }))
    setIsProcessing(true)
    setPaymentError(null)
    try {
      const res = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId:     event.id,
          numAdults:   data.numAdults,
          numChildren: data.numChildren ?? 0,
          email:       data.email,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.clientSecret) {
        toast.error(json.error ?? 'Could not start payment. Please try again.')
        setIsProcessing(false)
        return
      }
      setClientSecret(json.clientSecret)
      setPaymentIntentId(json.paymentIntentId)
      setStripePromise(getStripe())
      setStep('payment')
    } catch (err) {
      console.error('[ticket] PaymentIntent error:', err)
      toast.error('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Called by <TicketPaymentForm> after stripe.confirmPayment succeeds.
   * Persists the booking server-side (which re-verifies the intent).
   */
  const finaliseBooking = async (pid: string) => {
    if (!formSnapshot) return
    setIsProcessing(true)
    try {
      const res = await fetch('/.netlify/functions/ticket-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId:         event.id,
          firstName:       formSnapshot.firstName,
          lastName:        formSnapshot.lastName,
          phone:           formSnapshot.phone,
          email:           formSnapshot.email,
          numAdults:       formSnapshot.numAdults,
          numChildren:     formSnapshot.numChildren ?? 0,
          amountEur:       total,
          paymentGateway:  'stripe',
          paymentIntentId: pid,
          consentGdpr:     true,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Booking failed. Please contact us with your payment reference: ' + pid)
        setPaymentError(json.error ?? 'Booking failed after payment.')
        return
      }
      sessionStorage.removeItem('ticket_booking_pending')
      const ref   = encodeURIComponent(json.referenceNumber ?? '')
      const name  = encodeURIComponent(`${formSnapshot.firstName} ${formSnapshot.lastName}`)
      const title = encodeURIComponent(event.title)
      onOpenChange(false)
      navigate(`/ticket-success?ref=${ref}&name=${name}&event=${title}&amount=${total}&adults=${formSnapshot.numAdults}&children=${formSnapshot.numChildren ?? 0}`)
    } catch (err) {
      console.error('[ticket] finaliseBooking error:', err)
      toast.error('Network error. Your payment succeeded; please email us with this reference: ' + pid)
    } finally {
      setIsProcessing(false)
    }
  }

  const eventDate = formatDate(event.date)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-0 gap-0">

        {/* ── Step 1: Attendee Details ── */}
        {step === 'details' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-amber-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                  <Ticket size={20} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-amber-800 leading-snug truncate">
                    Book Tickets — {event.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                    {eventDate}{event.time ? ` · ${event.time}` : ''} · {event.location}
                  </DialogDescription>
                </div>
              </div>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                  <span className="text-xs font-semibold text-amber-700">Your Details</span>
                </div>
                <div className="flex-1 h-px bg-amber-200" />
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-amber-200 text-amber-500 text-xs font-bold flex items-center justify-center">2</div>
                  <span className="text-xs text-amber-400">Payment</span>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit(onDetailsSubmit)} noValidate>
              <div className="px-6 py-5 space-y-4">

                {/* Ticket price summary */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Ticket Price</p>
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Adult ticket</span>
                    <span className="font-semibold">€{adultPrice.toFixed(2)}</span>
                  </div>
                  {childPrice === 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Children (under 12)</span>
                      <span>Free</span>
                    </div>
                  )}
                </div>

                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tb-firstName" className="flex items-center gap-1.5 mb-1.5">
                      <User size={13} className="text-amber-600" />
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="tb-firstName"
                      autoComplete="given-name"
                      placeholder="Arjun"
                      aria-invalid={!!errors.firstName}
                      className={cn(errors.firstName && 'border-red-400 focus-visible:ring-red-300')}
                      {...register('firstName')}
                    />
                    <FieldError message={errors.firstName?.message} />
                  </div>
                  <div>
                    <Label htmlFor="tb-lastName" className="flex items-center gap-1.5 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="tb-lastName"
                      autoComplete="family-name"
                      placeholder="Sharma"
                      aria-invalid={!!errors.lastName}
                      className={cn(errors.lastName && 'border-red-400 focus-visible:ring-red-300')}
                      {...register('lastName')}
                    />
                    <FieldError message={errors.lastName?.message} />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="tb-phone" className="flex items-center gap-1.5 mb-1.5">
                    <Phone size={13} className="text-amber-600" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tb-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+353851234567"
                    aria-invalid={!!errors.phone}
                    className={cn(errors.phone && 'border-red-400 focus-visible:ring-red-300')}
                    {...register('phone')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">International format with country code</p>
                  <FieldError message={errors.phone?.message} />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="tb-email" className="flex items-center gap-1.5 mb-1.5">
                    <Envelope size={13} className="text-amber-600" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tb-email"
                    type="email"
                    autoComplete="email"
                    placeholder="arjun@example.com"
                    aria-invalid={!!errors.email}
                    className={cn(errors.email && 'border-red-400 focus-visible:ring-red-300')}
                    {...register('email')}
                  />
                  <FieldError message={errors.email?.message} />
                </div>

                {/* Attendees row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tb-adults" className="flex items-center gap-1.5 mb-1.5">
                      <Users size={13} className="text-amber-600" />
                      Adults <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="tb-adults"
                      type="number"
                      min={1}
                      max={20}
                      aria-invalid={!!errors.numAdults}
                      className={cn(errors.numAdults && 'border-red-400 focus-visible:ring-red-300')}
                      {...register('numAdults')}
                    />
                    <FieldError message={errors.numAdults?.message} />
                  </div>
                  <div>
                    <Label htmlFor="tb-children" className="flex items-center gap-1.5 mb-1.5">
                      <Baby size={13} className="text-amber-600" />
                      Children
                      <span className="text-muted-foreground text-[10px] ml-1">(free)</span>
                    </Label>
                    <Input
                      id="tb-children"
                      type="number"
                      min={0}
                      max={20}
                      aria-invalid={!!errors.numChildren}
                      className={cn(errors.numChildren && 'border-red-400 focus-visible:ring-red-300')}
                      {...register('numChildren')}
                    />
                    <FieldError message={errors.numChildren?.message} />
                  </div>
                </div>

                {/* Live order total */}
                <div className="rounded-xl bg-amber-600 text-white px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold opacity-90">
                    Total · {numAdults} adult{Number(numAdults) !== 1 ? 's' : ''}
                    {Number(numChildren) > 0 ? ` + ${numChildren} child${Number(numChildren) !== 1 ? 'ren' : ''}` : ''}
                  </span>
                  <span className="text-xl font-bold">€{total.toFixed(2)}</span>
                </div>

                {/* GDPR Consent */}
                <div
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    errors.consentGdpr
                      ? 'border-red-300 bg-red-50'
                      : 'border-amber-200 bg-amber-50/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="tb-consent"
                      checked={consentValue === true}
                      onCheckedChange={(checked) => {
                        setValue('consentGdpr', checked === true ? true : (undefined as unknown as true), {
                          shouldValidate: true,
                        })
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="tb-consent" className="text-sm leading-relaxed cursor-pointer text-slate-700">
                      I consent to the Hindu Association of Ireland processing my personal data
                      (name, phone, email) for the purpose of this ticket booking, in accordance
                      with GDPR. <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <FieldError message={errors.consentGdpr?.message} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3 border-t border-amber-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 font-semibold"
                >
                  Continue to Payment
                  <ArrowRight size={16} className="ml-2" weight="bold" />
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 'payment' && formSnapshot && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-amber-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                  <CreditCard size={20} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-amber-800">
                    Payment
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                    {event.title}
                  </DialogDescription>
                </div>
              </div>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">✓</div>
                  <span className="text-xs text-emerald-600 font-medium">Your Details</span>
                </div>
                <div className="flex-1 h-px bg-amber-300" />
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                  <span className="text-xs font-semibold text-amber-700">Payment</span>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5">

              {/* Order summary */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Order Summary</p>
                <div className="space-y-1.5 text-sm text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <CalendarBlank size={12} />
                      {eventDate}{event.time ? ` · ${event.time}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {event.location}
                    </span>
                  </div>
                </div>
                <div className="border-t border-amber-200 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>{formSnapshot.numAdults} × Adult ticket</span>
                    <span>€{(formSnapshot.numAdults * adultPrice).toFixed(2)}</span>
                  </div>
                  {Number(formSnapshot.numChildren) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>{formSnapshot.numChildren} × Child ticket</span>
                      <span>Free</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-amber-800 pt-1 border-t border-amber-200">
                    <span>Total</span>
                    <span className="text-lg">€{total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 border-t border-amber-200 pt-2">
                  Booking for <span className="font-medium text-slate-700">{formSnapshot.firstName} {formSnapshot.lastName}</span>
                  {' · '}{formSnapshot.email}
                </div>
              </div>

              {/* Embedded Stripe Payment Element */}
              {clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: 'stripe', variables: { colorPrimary: '#d97706' } },
                  } satisfies StripeElementsOptions}
                >
                  <TicketPaymentForm
                    onPaid={finaliseBooking}
                    onError={(msg) => setPaymentError(msg)}
                    total={total}
                    paymentIntentId={paymentIntentId}
                    externalProcessing={isProcessing}
                    onBack={() => setStep('details')}
                  />
                </Elements>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <Spinner size={16} className="inline mr-2 animate-spin" />
                  Loading secure payment form…
                </div>
              )}

              {paymentError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                  <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 3 (success) now navigates to /ticket-success — no inline step needed */}

      </DialogContent>
    </Dialog>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Embedded Stripe Payment Element form
 *  Renders the universal PaymentElement, calls stripe.confirmPayment with
 *  redirect:'if_required' so we can finalise the booking inline when no
 *  3DS challenge is required.  For redirect-based methods Stripe will send
 *  the user to confirmParams.return_url and our success page will pick up
 *  the payment_intent query param.
 * ────────────────────────────────────────────────────────────────────────── */
interface TicketPaymentFormProps {
  onPaid: (paymentIntentId: string) => void | Promise<void>
  onError: (msg: string) => void
  total: number
  paymentIntentId: string | null
  externalProcessing: boolean
  onBack: () => void
}

function TicketPaymentForm({
  onPaid,
  onError,
  total,
  paymentIntentId,
  externalProcessing,
  onBack,
}: TicketPaymentFormProps) {
  const stripe   = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    onError('')
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // For card flows that need redirect (3DS), come back to a page that
          // can pick up the result.  Our success route handles ?payment_intent.
          return_url: `${window.location.origin}/ticket-success`,
        },
        redirect: 'if_required',
      })
      if (error) {
        // error.message is user-safe per Stripe docs.
        onError(error.message ?? 'Payment failed. Please try a different card.')
        setSubmitting(false)
        return
      }
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await onPaid(paymentIntent.id)
      } else if (paymentIntent && paymentIntentId) {
        // Edge case: status not succeeded but no error (e.g. processing for
        // bank debits) — let user know.
        onError(`Payment is ${paymentIntent.status}. Please refresh once your bank confirms.`)
        setSubmitting(false)
      } else {
        onError('Unexpected payment state. Please try again.')
        setSubmitting(false)
      }
    } catch (err) {
      console.error('[ticket] confirmPayment error:', err)
      onError('Unexpected error. Please try again.')
      setSubmitting(false)
    }
  }

  const disabled = !stripe || !elements || !ready || submitting || externalProcessing

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: 'tabs' }}
        />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={submitting || externalProcessing}
          className="border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          <ArrowLeft size={16} className="mr-1" weight="bold" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={disabled}
          className="flex-1 bg-linear-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 font-semibold disabled:opacity-50"
        >
          {submitting || externalProcessing ? (
            <>
              <Spinner size={16} className="mr-2 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <CreditCard size={16} className="mr-2" weight="fill" />
              Pay €{total.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
