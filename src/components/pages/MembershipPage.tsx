import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Heart,
  CheckCircle,
  CreditCard,
  Spinner,
  Crown,
  Sparkle,
  Users,
  ShieldCheck,
  ArrowDown,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HeroCarousel } from '@/components/HeroCarousel'
import { cn } from '@/lib/utils'
import { useMembership } from '@/hooks/useMembership'
import type { MembershipPlan, MembershipRecord } from '@/data/membership'

type PaymentMethod = MembershipRecord['paymentMethod']

// Only Stripe is wired up at the moment; the other gateways listed in earlier
// mocks (PayPal, SumUp) were placeholders and never actually charged a card.
const PAYMENT_METHODS: { id: PaymentMethod; label: string; description: string; glyph: string }[] = [
  { id: 'stripe', label: 'Card (Stripe)', description: 'Visa, Mastercard, Apple Pay, Google Pay', glyph: '💳' },
]

export function MembershipPage() {
  const { plans } = useMembership()
  const [selected, setSelected] = useState<MembershipPlan | null>(null)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe')
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<MembershipRecord | null>(null)
  const [highlightedId, setHighlightedId] = useState<MembershipPlan['id'] | null>(null)

  /** Smooth-scroll from a hero pill to its plan card and briefly
   *  highlight the card so the user clearly sees where they landed. */
  const scrollToPlan = (planId: MembershipPlan['id']) => {
    const el = document.getElementById(`plan-${planId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(planId)
    window.setTimeout(() => setHighlightedId((cur) => (cur === planId ? null : cur)), 1800)
  }

  const openFor = (plan: MembershipPlan) => {
    setSelected(plan)
    setStep('details')
    setReceipt(null)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setTimeout(() => {
      setSelected(null)
      setFullName('')
      setEmail('')
      setPhone('')
      setPaymentMethod('stripe')
      setStep('details')
      setReceipt(null)
    }, 250)
  }

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      toast.error('Please enter your name and email.')
      return
    }
    setStep('payment')
  }

  const pay = async () => {
    if (!selected) return
    setProcessing(true)
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind:       'membership',
          planId:     selected.id,
          fullName:   fullName.trim(),
          email:      email.trim(),
          phone:      phone.trim() || undefined,
          successUrl: `${window.location.origin}/membership-success`,
          cancelUrl:  `${window.location.origin}/membership?cancelled=1`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        console.error('[membership] checkout error:', json)
        toast.error(json.error ?? 'Could not start Stripe checkout. Please try again.')
        setProcessing(false)
        return
      }
      // Hand off to Stripe-hosted checkout for subscription.
      window.location.href = json.url
    } catch (err) {
      console.error('[membership] network error:', err)
      toast.error('Network error. Please check your connection and try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col">
      <HeroCarousel
        title="Become a Member"
        subtitle="Support the Hindu Temple project in Limerick and join a 10‑year‑strong community"
      >
        {/* Quick-jump pills: each chip scrolls to its matching plan card
            below and briefly highlights it — gives visitors a fast,
            obvious path from the hero CTA to the actual offer. */}
        <div className="mt-8 flex flex-col items-center gap-4">
     
          <div className="flex flex-wrap justify-center gap-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => scrollToPlan(plan.id)}
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 hover:shadow-lg',
                  plan.popular && 'border-amber-200/70 bg-amber-200/20 shadow-md',
                )}
                aria-label={`Scroll to ${plan.name} plan — €${plan.price}`}
              >
                {plan.popular && (
                  <Sparkle size={14} weight="fill" className="text-amber-200" />
                )}
                <span>{plan.name}</span>
                <span className="text-white/80">•</span>
                <span>€{plan.price}</span>
                <ArrowDown
                  size={14}
                  weight="bold"
                  className="transition-transform group-hover:translate-y-0.5"
                />
              </button>
            ))}
          </div>
        </div>
      </HeroCarousel>

      <section className="py-8 md:py-12 bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-50">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold text-orange-800 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Choose your membership
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Memberships fund our weekly satsangs, monthly community prayers and the
              long‑term goal of establishing a permanent Hindu Temple in Limerick. All
              plans renew manually — cancel any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                id={`plan-${plan.id}`}
                className={cn(
                  'relative scroll-mt-32 border-orange-200/60 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all',
                  plan.popular &&
                    'border-2 border-orange-500 shadow-xl scale-[1.02] ring-4 ring-orange-100',
                  highlightedId === plan.id &&
                    'ring-4 ring-orange-400 shadow-2xl animate-pulse-glow-saffron',
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-linear-to-r from-orange-600 to-amber-600 text-white shadow-lg">
                    <Sparkle className="mr-1" weight="fill" size={14} />
                    Most popular
                  </Badge>
                )}
                <CardContent className="p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 glow-saffron">
                      <Crown className="text-orange-600" size={28} weight="duotone" />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-bold text-orange-800"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {plan.name}
                      </h3>
                      <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">
                        {plan.durationLabel}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-4xl font-bold text-orange-800">€{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/ {plan.durationLabel}</span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>

                  <ul className="space-y-2">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-sm">
                        <CheckCircle
                          size={18}
                          weight="fill"
                          className="mt-0.5 shrink-0 text-orange-600"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => openFor(plan)}
                    className={cn(
                      'w-full h-12 font-semibold',
                      plan.popular
                        ? 'bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron'
                        : 'bg-white text-orange-700 border-2 border-orange-300 hover:bg-orange-50',
                    )}
                  >
                    <Heart className="mr-2" weight="fill" />
                    Join {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Feature
              icon={Users}
              title="Community first"
              text="A decade of cultural, religious and service events across Limerick."
            />
            <Feature
              icon={ShieldCheck}
              title="Mock payments — Phase 1"
              text="Payments are simulated. No card data leaves your browser."
            />
            <Feature
              icon={Crown}
              title="Recognition"
              text="Annual members are featured on the temple member wall."
            />
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={(o) => (!o ? close() : null)}>
        <DialogContent className="sm:max-w-[520px] bg-linear-to-br from-orange-50 via-white to-amber-50">
          {step === 'details' && selected && (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-2xl text-orange-800"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Join — {selected.name} membership
                </DialogTitle>
                <DialogDescription>
                  €{selected.price} for {selected.durationLabel}. Tell us about yourself.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submitDetails} className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="mem-name" className="mb-1.5 block">
                    Full name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mem-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mem-email" className="mb-1.5 block">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mem-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mem-phone" className="mb-1.5 block">
                    Phone (optional)
                  </Label>
                  <Input
                    id="mem-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(087) 000 0000"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
                >
                  Continue to payment
                </Button>
              </form>
            </>
          )}

          {step === 'payment' && selected && (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-2xl text-orange-800"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Choose a payment method
                </DialogTitle>
                <DialogDescription>
                  €{selected.price} • {selected.name} membership for {fullName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
                      paymentMethod === pm.id
                        ? 'border-orange-500 bg-orange-50 shadow-md'
                        : 'border-orange-200 bg-white hover:border-orange-400',
                    )}
                  >
                    <div className="text-3xl">{pm.glyph}</div>
                    <div className="flex-1">
                      <div className="font-bold text-orange-800">{pm.label}</div>
                      <div className="text-sm text-muted-foreground">{pm.description}</div>
                    </div>
                    <CreditCard
                      size={22}
                      weight="duotone"
                      className={
                        paymentMethod === pm.id ? 'text-orange-600' : 'text-orange-300'
                      }
                    />
                  </button>
                ))}
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800 flex items-start gap-2">
                  <ShieldCheck size={16} weight="fill" className="shrink-0 mt-0.5 text-orange-600" />
                  <span>
                    You'll be redirected to Stripe's secure checkout. Your
                    membership will renew automatically until you cancel.
                  </span>
                </div>
                <Button
                  onClick={pay}
                  disabled={processing}
                  className="w-full h-12 bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
                >
                  {processing ? (
                    <>
                      <Spinner className="mr-2 animate-spin" />
                      Redirecting to Stripe…
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2" weight="fill" />
                      Continue to Stripe · €{selected.price}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'success' && receipt && selected && (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="rounded-full bg-orange-100 p-4 glow-saffron">
                    <CheckCircle size={48} weight="fill" className="text-orange-600" />
                  </div>
                  <DialogTitle
                    className="text-2xl text-orange-800"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Welcome to HAI, {receipt.fullName.split(' ')[0]}!
                  </DialogTitle>
                  <DialogDescription>
                    Your {selected.name.toLowerCase()} membership is active.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="space-y-3 mt-2 rounded-xl bg-white border border-orange-200 p-5 text-sm">
                <Row label="Plan" value={`${selected.name} (€${selected.price})`} />
                <Row label="Member" value={`${receipt.fullName} • ${receipt.email}`} />
                <Row label="Start" value={receipt.startDate} />
                <Row label="Expires" value={receipt.expiresOn} />
                <Row label="Payment" value={receipt.paymentMethod.toUpperCase()} />
                <Row label="Reference" value={receipt.reference} mono />
              </div>
              <Button
                onClick={close}
                className="w-full h-12 bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                Done
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ size?: number; weight?: 'duotone' | 'fill'; className?: string }>
  title: string
  text: string
}) {
  return (
    <Card className="border-orange-200/60 bg-white/85 backdrop-blur-sm">
      <CardContent className="p-6 text-center space-y-3">
        <div className="mx-auto rounded-xl bg-linear-to-br from-orange-100 to-amber-100 p-3 inline-flex glow-saffron">
          <Icon size={28} weight="duotone" className="text-orange-600" />
        </div>
        <h3
          className="text-lg font-bold text-orange-800"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-orange-700 font-medium">{label}</span>
      <span className={cn('text-right text-orange-900', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}
