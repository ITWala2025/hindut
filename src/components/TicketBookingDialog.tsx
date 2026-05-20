/**
 * TicketBookingDialog.tsx
 * Single-step modal for paid event ticket booking:
 *   Step 1 – Attendee details + ticket count
 *   On submit → redirect to Stripe-hosted Checkout (same pattern as DonationDialog)
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
  Ticket,
  ArrowRight,
  Spinner,
  User,
  Phone,
  Envelope,
  Users,
  Baby,
  Warning,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TempleEvent } from '@/data/events'

// ---------------------------------------------------------------------------
// Validation schema
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
  const [isProcessing, setIsProcessing] = useState(false)

  const adultPrice = event.price ?? 0

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

  const numAdults    = watch('numAdults') || 1
  const numChildren  = watch('numChildren') || 0
  const consentValue = watch('consentGdpr')

  const total = Number(numAdults) * adultPrice

  const handleClose = (v: boolean) => {
    if (!v) setTimeout(() => reset(), 300)
    onOpenChange(v)
  }

  // On submit: call create-checkout-session and redirect to Stripe Checkout.
  const onDetailsSubmit = async (data: DetailsFormData) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind:        'ticket',
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
      if (!res.ok || !json.url) {
        console.error('[ticket] checkout error:', json)
        toast.error(json.error ?? 'Could not start payment. Please try again.')
        setIsProcessing(false)
        return
      }
      // Hand off to Stripe-hosted Checkout.
      window.location.href = json.url
    } catch (err) {
      console.error('[ticket] checkout network error:', err)
      toast.error('Network error. Please try again.')
      setIsProcessing(false)
    }
  }

  const eventDate = formatDate(event.date)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-0 gap-0">

        {/* ── Attendee Details ── */}
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
                  <span className="text-xs text-amber-400">Stripe Checkout</span>
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
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Children (under 12)</span>
                    <span>Free</span>
                  </div>
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
                  disabled={isProcessing}
                  className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 font-semibold disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <Spinner size={16} className="mr-2 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight size={16} className="ml-2" weight="bold" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        </DialogContent>
    </Dialog>
  )
}
