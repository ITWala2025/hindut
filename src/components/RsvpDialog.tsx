/**
 * RsvpDialog.tsx
 * Modal form for free-event RSVPs. Uses react-hook-form + zod for
 * real-time client-side validation mirroring server-side rules.
 *
 * When an event has optional services (eventServices), the form shows a
 * service selection step. If the user selects any services:
 *   1. RSVP is submitted and confirmed immediately (event is free).
 *   2. A Stripe Checkout session is created for the selected services.
 *   3. User is redirected to Stripe to complete payment.
 * If no services are selected the existing RSVP-only flow is unchanged.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  CheckCircle,
  Spinner,
  User,
  Phone,
  Envelope,
  Users,
  Baby,
  CalendarBlank,
  ClipboardText,
  Warning,
  CreditCard,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EventService, TempleEvent } from '@/data/events'

// ---------------------------------------------------------------------------
// Validation schema (mirrors edge-function schema exactly)
// ---------------------------------------------------------------------------
const rsvpSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name is too long')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long')
    .regex(/^[a-zA-ZÀ-ÿ\s\-']+$/, 'Last name contains invalid characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^\+[1-9]\d{1,14}$/,
      'Enter in E.164 format, e.g. +353851234567',
    ),
  email: z
    .string()
    .min(1, 'Email address is required')
    .max(254, 'Email address is too long')
    .email('Enter a valid email address'),
  numAdults: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(1, 'At least 1 adult required')
    .max(20, 'Maximum 20 adults per RSVP'),
  numChildren: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(20, 'Maximum 20 children per RSVP')
    .optional()
    .default(0),
  consentGdpr: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the data processing terms to RSVP' }),
  }),
})

type RsvpFormData = z.infer<typeof rsvpSchema>

interface RsvpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: TempleEvent
}

type Step = 'form' | 'success'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatEventDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
// Component
// ---------------------------------------------------------------------------
export function RsvpDialog({ open, onOpenChange, event }: RsvpDialogProps) {
  const [step, setStep] = useState<Step>('form')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set())

  const availableServices: EventService[] = event.eventServices ?? []
  const hasServices = availableServices.length > 0

  const selectedServices = availableServices.filter((s) => selectedServiceIds.has(s.serviceId))
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.amountEur, 0)

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(serviceId)) next.delete(serviceId)
      else next.add(serviceId)
      return next
    })
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<RsvpFormData>({
    resolver: zodResolver(rsvpSchema),
    mode: 'onChange',
    defaultValues: {
      numAdults: 1,
      numChildren: 0,
    },
  })

  const consentValue = watch('consentGdpr')

  const handleClose = (v: boolean) => {
    if (!v) {
      setTimeout(() => {
        reset()
        setStep('form')
        setSelectedServiceIds(new Set())
      }, 300)
    }
    onOpenChange(v)
  }

  const onSubmit = async (data: RsvpFormData) => {
    setIsSubmitting(true)
    try {
      // Step 1: Submit RSVP
      const res = await fetch('/.netlify/functions/rsvp-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId:     event.id,
          firstName:   data.firstName,
          lastName:    data.lastName,
          phone:       data.phone,
          email:       data.email,
          numAdults:   data.numAdults,
          numChildren: data.numChildren ?? 0,
          consentGdpr: true,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (json.details) {
          const firstError = Object.values(json.details as Record<string, string[]>)[0]?.[0]
          toast.error(firstError ?? json.error ?? 'Submission failed. Please check the form.')
        } else {
          toast.error(json.error ?? 'Submission failed. Please try again.', {
            description: json._debug
              ? `Debug: ${json._debug}${json._stack ? ' | ' + json._stack.split(' | ')[0] : ''}`
              : undefined,
            duration: 15000,
          })
        }
        return
      }

      setReferenceNumber(json.referenceNumber)

      // Step 2: If services selected, redirect to Stripe Checkout
      if (selectedServices.length > 0) {
        if (!json.rsvpId) {
          toast.error('RSVP saved, but the server did not return an ID needed for payment. Please contact us or restart the dev server.')
          setStep('success')
          return
        }

        const checkoutRes = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind:       'rsvp_service',
            rsvpId:     json.rsvpId,
            eventId:    event.id,
            email:      data.email,
            firstName:  data.firstName,
            lastName:   data.lastName,
            services:   selectedServices.map((s) => ({
              serviceId: s.serviceId,
              name:      s.name,
              amountEur: s.amountEur,
            })),
            cancelUrl: `${window.location.origin}/events/${event.slug}?rsvp_service_payment=cancelled`,
          }),
        })

        const checkoutJson = await checkoutRes.json()

        if (!checkoutRes.ok || !checkoutJson.url) {
          toast.error(
            `Your RSVP is confirmed (ref: ${json.referenceNumber}), but the payment setup failed: ${checkoutJson?.error ?? `HTTP ${checkoutRes.status}`}. Please contact us.`,
            { duration: 20000 },
          )
          setStep('success')
          return
        }

        // Redirect to Stripe — page navigates away
        window.location.href = checkoutJson.url
        return
      }

      setStep('success')
    } catch {
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const eventDate = formatEventDate(event.date)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-0 gap-0">
        {step === 'form' ? (
          <>
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-orange-100">
              <div className="flex items-center gap-3 mb-1">
                <div className="rounded-xl bg-orange-100 p-2.5 text-orange-600">
                  <CalendarBlank size={20} weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-orange-800 leading-snug truncate">
                    RSVP — {event.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                    {eventDate}{event.time ? ` · ${event.time}` : ''} · {event.location}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="px-6 py-5 space-y-4">

                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="rsvp-firstName" className="flex items-center gap-1.5 mb-1.5">
                      <User size={13} className="text-orange-600" />
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="rsvp-firstName"
                      autoComplete="given-name"
                      placeholder="Arjun"
                      aria-invalid={!!errors.firstName}
                      aria-describedby={errors.firstName ? 'err-firstName' : undefined}
                      className={cn(errors.firstName && 'border-red-400 focus-visible:ring-red-300')}
                      {...register('firstName')}
                    />
                    <FieldError message={errors.firstName?.message} />
                  </div>

                  <div>
                    <Label htmlFor="rsvp-lastName" className="flex items-center gap-1.5 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="rsvp-lastName"
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
                  <Label htmlFor="rsvp-phone" className="flex items-center gap-1.5 mb-1.5">
                    <Phone size={13} className="text-orange-600" />
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rsvp-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+353851234567"
                    aria-invalid={!!errors.phone}
                    className={cn(errors.phone && 'border-red-400 focus-visible:ring-red-300')}
                    {...register('phone')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    International format with country code, e.g. +353851234567
                  </p>
                  <FieldError message={errors.phone?.message} />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="rsvp-email" className="flex items-center gap-1.5 mb-1.5">
                    <Envelope size={13} className="text-orange-600" />
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rsvp-email"
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
                    <Label htmlFor="rsvp-adults" className="flex items-center gap-1.5 mb-1.5">
                      <Users size={13} className="text-orange-600" />
                      Adults <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="rsvp-adults"
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
                    <Label htmlFor="rsvp-children" className="flex items-center gap-1.5 mb-1.5">
                      <Baby size={13} className="text-orange-600" />
                      Children
                      <span className="text-muted-foreground text-[10px] ml-1">(optional)</span>
                    </Label>
                    <Input
                      id="rsvp-children"
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

                {/* Optional Services */}
                {hasServices && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-orange-900 mb-0.5">Prayer services</p>
                      <p className="text-xs text-muted-foreground">
                        Select any Prayer services you'd like to book. Payment is collected securely via Stripe.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {availableServices.map((svc) => (
                        <label
                          key={svc.serviceId}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2.5 cursor-pointer transition-colors',
                            selectedServiceIds.has(svc.serviceId)
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-slate-200 hover:border-orange-300',
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={selectedServiceIds.has(svc.serviceId)}
                              onCheckedChange={() => toggleService(svc.serviceId)}
                            />
                            <span className="text-sm font-medium text-slate-800">{svc.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-orange-700 shrink-0">
                            €{svc.amountEur.toFixed(2)}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedServices.length > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-orange-200">
                        <span className="text-xs text-muted-foreground">Services total</span>
                        <span className="text-sm font-bold text-orange-800">
                          €{servicesTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* GDPR Consent */}
                <div
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    errors.consentGdpr
                      ? 'border-red-300 bg-red-50'
                      : 'border-orange-200 bg-orange-50/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="rsvp-consent"
                      checked={consentValue === true}
                      onCheckedChange={(checked) => {
                        setValue('consentGdpr', checked === true ? true : (undefined as unknown as true), {
                          shouldValidate: true,
                        })
                      }}
                      className="mt-0.5"
                      aria-invalid={!!errors.consentGdpr}
                    />
                    <Label htmlFor="rsvp-consent" className="text-sm leading-relaxed cursor-pointer text-slate-700">
                      I consent to the Hindu Association of Ireland processing my personal
                      data (name, phone, email) solely for the purpose of this event RSVP,
                      in accordance with GDPR. Data will be retained only as long as
                      necessary and will not be shared with third parties.{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <FieldError message={errors.consentGdpr?.message} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3 border-t border-orange-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size={16} className="mr-2 animate-spin" />
                      {selectedServices.length > 0 ? 'Confirming & redirecting…' : 'Sending RSVP…'}
                    </>
                  ) : selectedServices.length > 0 ? (
                    <>
                      <CreditCard size={16} className="mr-2" weight="fill" />
                      Confirm & Pay €{servicesTotal.toFixed(2)}
                    </>
                  ) : (
                    <>
                      <ClipboardText size={16} className="mr-2" weight="fill" />
                      Confirm RSVP
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          /* Success screen */
          <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
            <div className="rounded-full bg-emerald-100 p-5 text-emerald-600">
              <CheckCircle size={44} weight="fill" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                You're confirmed!
              </h2>
              <p className="text-muted-foreground">
                A confirmation email with an iCal attachment has been sent.
              </p>
            </div>

            <div className="w-full rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs text-orange-700 uppercase tracking-widest mb-1">
                Reservation Reference
              </p>
              <p className="text-3xl font-bold font-mono tracking-widest text-orange-800">
                {referenceNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Keep this number for your records
              </p>
            </div>

            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left space-y-1.5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{event.title}</p>
              <p>{eventDate}{event.time ? ` · ${event.time}` : ''}</p>
              <p>{event.location}</p>
            </div>

            <Button
              onClick={() => handleClose(false)}
              className="w-full bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold mt-2"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
