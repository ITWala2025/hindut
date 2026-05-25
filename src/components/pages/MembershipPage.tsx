import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Heart,
  CheckCircle,
  CreditCard,
  Spinner,
  Crown,
  Sparkle,
  Users,
  ShieldCheck,
  HandCoins,
  CalendarBlank,
  Star,
  Lock,
  ArrowRight,
  Leaf,
  Flame,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { HeroCarousel } from '@/components/HeroCarousel'
import { cn } from '@/lib/utils'
import { useMembership } from '@/hooks/useMembership'
import type { MembershipPlan } from '@/data/membership'
import { SeoMeta } from '@/lib/seo'

// ── Icon resolver: maps DB-stored icon names to phosphor components ───────────
const ICON_MAP: Record<string, PhosphorIcon> = {
  Flame, Leaf, Crown, HandCoins, Star, Heart, Sparkle,
}
function resolveIcon(name: string | undefined): PhosphorIcon {
  return (name && ICON_MAP[name]) || HandCoins
}

// ── Giving tile shape (DB-driven + a hard-coded “Custom” fallback) ──────────────
interface GivingTile {
  id: string
  name: string
  subtitle: string
  amount: number | null
  Icon: PhosphorIcon
  gradient: string
  bg: string
  border: string
  description: string
  perks: string[]
  popular: boolean
}

const CUSTOM_TILE: GivingTile = {
  id: 'custom',
  name: 'Custom',
  subtitle: 'Your Choice',
  amount: null,
  Icon: HandCoins,
  gradient: 'from-slate-600 to-slate-700',
  bg: 'from-slate-50 to-gray-50',
  border: 'border-slate-200',
  description: 'Give the amount that feels right for you, every month.',
  perks: ['Benefits based on contribution', 'Flexible giving', 'Cancel any time'],
  popular: false,
}

function planToTile(plan: MembershipPlan): GivingTile {
  return {
    id: plan.id,
    name: plan.name,
    subtitle: plan.subtitle ?? '',
    amount: plan.price,
    Icon: resolveIcon(plan.icon),
    gradient: plan.gradient ?? 'from-orange-500 to-amber-500',
    bg: plan.bgGradient ?? 'from-orange-50 to-amber-50',
    border: plan.borderColor ?? 'border-orange-200',
    description: plan.description,
    perks: plan.benefits,
    popular: !!plan.popular,
  }
}

// ── FAQ content ───────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'What does my membership fund?',
    a: 'Your membership directly supports weekly satsangs, monthly community prayers, cultural events, and the long-term goal of establishing a permanent Hindu Temple in Limerick.',
  },
  {
    q: 'Can I cancel my membership?',
    a: 'Yes. You can cancel your Stripe subscription at any time from the Stripe customer portal link sent to your email, or by contacting us directly. No cancellation fees apply.',
  },
  {
    q: 'What are the monthly giving tiers?',
    a: 'Monthly giving tiers (Shraddha, Seva, Bhakti) are recurring charitable donations processed via Stripe. Each tier unlocks specific spiritual benefits including Archana scheduling and Karpaga Vriksham leaf entry.',
  },
  {
    q: 'Is my payment secure?',
    a: 'Yes. All payments are processed by Stripe, which is PCI-DSS Level 1 certified. We never store your card details on our servers.',
  },
  {
    q: 'What does GDPR mean for my data?',
    a: 'We process your personal data solely for membership administration, in compliance with GDPR. You may request access, correction, or deletion of your data at any time by emailing us. Your consent timestamp is recorded when you join.',
  },
  {
    q: 'What is Nama-Nakshatra Archana?',
    a: 'Nama-Nakshatra Archana is a sacred prayer performed in your name on your birth-star (nakshatra) day each month, channelling blessings specifically for you and your family.',
  },
]

export function MembershipPage() {
  const { plans } = useMembership()

  // ── Membership checkout state ─────────────────────────────────────────────
  const [selected, setSelected] = useState<MembershipPlan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'payment'>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gdprConsent, setGdprConsent] = useState(false)
  const [addMonthly, setAddMonthly] = useState(false)
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0)
  const [monthlyCustom, setMonthlyCustom] = useState('')
  const [processing, setProcessing] = useState(false)

  // ── Monthly giving dialog state ───────────────────────────────────────────
  const [givingOpen, setGivingOpen] = useState(false)
  const [givingTier, setGivingTier] = useState<GivingTile | null>(null)
  const [givingCustom, setGivingCustom] = useState('')
  const [givingName, setGivingName] = useState('')
  const [givingEmail, setGivingEmail] = useState('')
  const [givingConsent, setGivingConsent] = useState(false)
  const [givingProcessing, setGivingProcessing] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const annualPlan = useMemo(
    () =>
      plans.find((p) => p.category === 'membership' && p.active && p.id === 'annual')
      ?? plans.find((p) => p.category === 'membership' && p.active),
    [plans],
  )

  const givingTiles = useMemo<GivingTile[]>(() => {
    const dbTiles = plans
      .filter((p) => p.category === 'giving' && p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(planToTile)
    return [...dbTiles, CUSTOM_TILE]
  }, [plans])

  const monthlyGivingAmounts = useMemo(
    () =>
      plans
        .filter((p) => p.category === 'giving' && p.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => p.price),
    [plans],
  )

  const openFor = (plan: MembershipPlan) => {
    setSelected(plan)
    setStep('details')
    setFullName('')
    setEmail('')
    setPhone('')
    setGdprConsent(false)
    setAddMonthly(true)
    const defaultAmt =
      plans.find((p) => p.category === 'giving' && p.active && p.popular)?.price ??
      plans.find((p) => p.category === 'giving' && p.active)?.price ??
      0
    setMonthlyAmount(defaultAmt)
    setMonthlyCustom('')
    setProcessing(false)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setTimeout(() => { setSelected(null); setStep('details') }, 250)
  }

  const submitDetails = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('Please enter your full name.'); return }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) { toast.error('Please enter a valid email address.'); return }
    if (!gdprConsent) { toast.error('Please accept the data processing consent to continue.'); return }
    setStep('payment')
  }

  const pay = async () => {
    if (!selected) return
    setProcessing(true)
    const effectiveMonthly = addMonthly
      ? (monthlyAmount > 0 ? monthlyAmount : parseFloat(monthlyCustom) || 0)
      : 0
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'membership',
          planId: selected.id,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          ...(effectiveMonthly >= 1 ? { monthlyContributionEur: effectiveMonthly } : {}),
          successUrl: `${window.location.origin}/membership-success`,
          cancelUrl: `${window.location.origin}/membership?cancelled=1`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Could not start Stripe checkout. Please try again.')
        setProcessing(false)
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Network error. Please check your connection and try again.')
      setProcessing(false)
    }
  }

  const openGiving = (tier: GivingTile) => {
    setGivingTier(tier)
    setGivingName('')
    setGivingEmail('')
    setGivingCustom('')
    setGivingConsent(false)
    setGivingProcessing(false)
    setGivingOpen(true)
  }

  const closeGiving = () => {
    setGivingOpen(false)
    setTimeout(() => setGivingTier(null), 250)
  }

  const payGiving = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!givingTier) return
    if (!givingName.trim()) { toast.error('Please enter your name.'); return }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(givingEmail)) { toast.error('Please enter a valid email.'); return }
    if (!givingConsent) { toast.error('Please accept the data consent to continue.'); return }
    const amount = givingTier.amount ?? parseFloat(givingCustom)
    if (!amount || amount < 1) { toast.error('Please enter a valid amount (min €1).'); return }
    setGivingProcessing(true)
    try {
      // Tiers backed by a DB plan (shraddha/seva/bhakti) go through the membership
      // flow so they land in `memberships`, not `donations`. The free-form
      // CUSTOM_TILE has no plan id and still uses the recurring donation flow.
      const isPlanTier = givingTier.id !== 'custom' && givingTier.amount !== null
      const body = isPlanTier
        ? {
            kind: 'membership' as const,
            planId: givingTier.id,
            fullName: givingName.trim(),
            email: givingEmail.trim(),
            successUrl: `${window.location.origin}/membership-success`,
            cancelUrl: `${window.location.origin}/membership?cancelled=1`,
          }
        : {
            kind: 'donation' as const,
            amountEur: amount,
            donorName: givingName.trim(),
            donorEmail: givingEmail.trim(),
            recurring: true,
            description: `Monthly giving – ${givingTier.name} tier`,
            successUrl: `${window.location.origin}/donation-success`,
            cancelUrl: `${window.location.origin}/membership?cancelled=1`,
          }
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Could not start Stripe checkout. Please try again.')
        setGivingProcessing(false)
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Network error. Please check your connection and try again.')
      setGivingProcessing(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <SeoMeta
        title="Membership — Support the Hindu Temple in Limerick"
        description="Become a member of the Hindu Association of Ireland and help build a permanent Hindu Temple in Limerick. Enjoy monthly archana, community recognition and more."
        canonical="/membership"
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <HeroCarousel
        title="Become a Member"
        subtitle="Join the Hindu Association of Ireland. 
        10+ years of spiritual community in Limerick"
      >
        <div className="mt-8 flex flex-col items-center gap-6">
          {/* Stats pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: '10+ Years', sub: 'of community' },
              { label: 'Limerick', sub: 'based temple' },
              { label: 'Annual', sub: 'archana service' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-2xl border border-white/30 bg-white/10 backdrop-blur-md px-6 py-3 text-white"
              >
                <span className="text-lg font-bold leading-none">{s.label}</span>
                <span className="text-xs text-white/70 mt-0.5">{s.sub}</span>
              </div>
            ))}
          </div>
          {/* Hero CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {annualPlan && (
              <Button
                onClick={() => openFor(annualPlan)}
                className="h-12 px-8 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
              >
                <Heart weight="fill" className="mr-2" />
                Join Now — €{annualPlan.price}/year
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => document.getElementById('monthly-giving')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-12 px-8 bg-white/10 border-white/40 text-white hover:bg-white/20 rounded-full backdrop-blur-md"
            >
              Monthly Giving
              <ArrowRight className="ml-2" size={16} />
            </Button>
          </div>
        </div>
      </HeroCarousel>

      {/* ── Membership Plans + Monthly Giving (side-by-side) ─────────────── */}
      <section id="monthly-giving" className="py-8 md:py-12 bg-linear-to-br from-slate-50 via-orange-50/40 to-amber-50/30 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-orange-100/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-orange-100 text-orange-700 border-orange-200 uppercase tracking-widest text-xs px-4 py-1.5">
              Join the Community
            </Badge>
            <h2
              className="text-3xl md:text-5xl font-bold text-slate-900 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Membership &amp; monthly giving
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              One-off annual membership or a recurring monthly commitment.every contribution directly sustains our community.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-14 items-stretch">

            {/* ── Left: Annual Membership ── */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-linear-to-r from-orange-200 to-transparent" />
                <span className="text-xs font-semibold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                  Annual Membership
                </span>
                <div className="flex-1 h-px bg-linear-to-l from-orange-200 to-transparent" />
              </div>
              {annualPlan && (
                <div className="relative flex-1 flex flex-col">
                  <div className="absolute -inset-px rounded-3xl bg-linear-to-r from-orange-500 via-amber-400 to-orange-600 opacity-60 blur-sm" />
                  <Card className="relative rounded-3xl border-0 bg-white shadow-2xl overflow-hidden flex-1 flex flex-col">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-orange-500 via-amber-400 to-orange-600" />
                    <CardContent className="p-8 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-start gap-4">
                          <div className="rounded-2xl bg-linear-to-br from-orange-100 to-amber-100 p-3.5 shrink-0">
                            <Crown size={28} weight="duotone" className="text-orange-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className="text-xl font-bold text-slate-900"
                                style={{ fontFamily: 'var(--font-heading)' }}
                              >
                                {annualPlan.name}
                              </h3>
                              <Badge className="bg-linear-to-r from-orange-600 to-amber-600 text-white border-0 text-xs">
                                <Sparkle size={10} weight="fill" className="mr-1" />
                                Most Popular
                              </Badge>
                            </div>
                            <p className="text-slate-500 text-sm">{annualPlan.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-4xl font-black text-orange-700">€{annualPlan.price}</div>
                          <div className="text-xs text-slate-500">/{annualPlan.durationLabel}</div>
                        </div>
                      </div>
                      <Separator className="my-5 bg-orange-100" />
                      <ul className="space-y-2.5 mb-7 flex-1">
                        {annualPlan.benefits.map((b) => (
                          <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                            <CheckCircle size={16} weight="fill" className="text-orange-500 mt-0.5 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => openFor(annualPlan)}
                          size="lg"
                          className="flex-1 h-12 text-base font-bold bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
                        >
                          <Heart weight="fill" className="mr-2" />
                          Join Annual Membership
                        </Button>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                          <Lock size={12} />
                          Stripe secured
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* ── Right: Monthly Giving ── */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-linear-to-r from-amber-200 to-transparent" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  Monthly Giving
                </span>
                <div className="flex-1 h-px bg-linear-to-l from-amber-200 to-transparent" />
              </div>
              <p className="text-sm text-slate-500 text-center mb-5 leading-relaxed">
                Choose a recurring tier for dedicated spiritual benefits. Cancel any time.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {givingTiles.map((tier) => {
                  const { Icon } = tier
                  return (
                    <div
                      key={tier.id}
                      className={cn(
                        'relative rounded-2xl border-2 p-5 flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all',
                        `bg-linear-to-br ${tier.bg}`,
                        tier.border,
                        tier.popular && 'ring-2 ring-offset-2 ring-emerald-400',
                      )}
                    >
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <Badge className="bg-emerald-600 text-white border-0 text-xs px-3 py-1">
                            <Star size={10} weight="fill" className="mr-1" />
                            Most Chosen
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl bg-linear-to-br flex items-center justify-center shadow-sm shrink-0',
                            tier.gradient,
                          )}
                        >
                          <Icon size={20} weight="duotone" className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="text-base font-bold text-slate-900 leading-tight truncate"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {tier.name}
                          </h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{tier.subtitle}</p>
                        </div>
                        <div className="ml-auto text-right shrink-0">
                          {tier.amount ? (
                            <span className="text-xl font-black text-slate-800 whitespace-nowrap">
                              €{tier.amount}
                              <span className="text-xs font-normal text-slate-500">/mo</span>
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-700">Custom</span>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1 mb-4 flex-1">
                        {tier.perks.map((p) => (
                          <li key={p} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <CheckCircle size={12} weight="fill" className="text-emerald-500 mt-0.5 shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => openGiving(tier)}
                        size="sm"
                        className={cn(
                          'w-full font-semibold rounded-xl text-xs h-8',
                          tier.popular
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        <HandCoins size={13} className="mr-1" />
                        Give {tier.amount ? `€${tier.amount}/mo` : 'monthly'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-8 md:py-12 bg-linear-to-br from-orange-950 via-amber-900 to-orange-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none opacity-5">
          <div className="absolute top-8 left-8 text-white text-[12rem] font-serif leading-none">ॐ</div>
          <div className="absolute bottom-8 right-8 text-white text-[12rem] font-serif leading-none">ॐ</div>
        </div>
        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Your member benefits
            </h2>
            <p className="text-orange-200 text-lg max-w-xl mx-auto">
              Every membership includes sacred services and community recognition.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {([
              {
                BIcon: CalendarBlank,
                title: 'Monthly Archana',
                desc: 'A Nama-Nakshatra Archana performed in your name on your birth-star day each month — connecting you to divine blessings.',
              },
              {
                BIcon: Star,
                title: 'Annual Special Archana',
                desc: 'A dedicated special-occasion Archana on your membership anniversary, honouring your continuous commitment to the community.',
              },
              {
                BIcon: Leaf,
                title: 'Karpaga Vriksham Entry',
                desc: 'Your name is inscribed on a Karpaga Vriksham leaf in our permanent digital sanctuary — a symbol of eternal merit.',
              },
            ] as const).map(({ BIcon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-8 text-center hover:bg-white/15 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-400 to-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-900/40">
                  <BIcon size={32} weight="duotone" className="text-white" />
                </div>
                <h3
                  className="text-xl font-bold text-white mb-3"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {title}
                </h3>
                <p className="text-orange-200 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ────────────────────────────────────────────────── */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {([
              { TIcon: Lock, text: 'Stripe secured payments', sub: 'PCI-DSS Level 1' },
              { TIcon: ShieldCheck, text: 'GDPR compliant', sub: 'Your data protected' },
              { TIcon: Users, text: 'Community focused', sub: '10+ years active' },
              { TIcon: CheckCircle, text: 'Cancel any time', sub: 'No lock-in' },
            ] as const).map(({ TIcon, text, sub }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                  <TIcon size={20} weight="duotone" className="text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{text}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-3xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Frequently asked questions
            </h2>
            <p className="text-slate-500">Everything you need to know before joining.</p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-slate-200 rounded-2xl px-6 data-[state=open]:border-orange-200 data-[state=open]:bg-orange-50/50 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold text-slate-800 hover:no-underline py-5 text-sm md:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-5 leading-relaxed text-sm">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="py-16 bg-linear-to-r from-orange-600 to-amber-600">
        <div className="container mx-auto px-6 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Ready to join our community?
          </h2>
          <p className="text-orange-100 mb-8 max-w-xl mx-auto">
            Become a member today and be part of building Limerick's permanent Hindu Temple.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {annualPlan && (
              <Button
                onClick={() => openFor(annualPlan)}
                size="lg"
                className="h-14 px-10 bg-white text-orange-700 hover:bg-orange-50 font-bold rounded-full shadow-xl"
              >
                <Heart weight="fill" className="mr-2" />
                Join Now — €{annualPlan.price}/year
              </Button>
            )}
            <Button
              onClick={() =>
                document.getElementById('monthly-giving')?.scrollIntoView({ behavior: 'smooth' })
              }
              size="lg"
              variant="outline"
              className="h-14 px-10 bg-transparent border-white/60 text-white hover:bg-white/10 rounded-full"
            >
              Explore Monthly Giving
            </Button>
          </div>
        </div>
      </section>

      {/* ── Membership Checkout Dialog ───────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="sm:max-w-[540px] bg-white p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          <div className="h-1.5 bg-linear-to-r from-orange-500 via-amber-400 to-orange-600" />
          <div className="p-8">

            {/* Step 1: Details */}
            {step === 'details' && selected && (
              <>
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0">
                      <Crown size={22} weight="duotone" className="text-orange-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-900">
                        Annual Membership
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        €{selected.price} · {selected.durationLabel}
                      </DialogDescription>
                    </div>
                  </div>
                  {/* Step indicator */}
                  <div className="flex gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-orange-500" />
                    <div className="flex-1 h-1 rounded-full bg-slate-200" />
                  </div>
                </DialogHeader>

                <form onSubmit={submitDetails} className="space-y-4">
                  <div>
                    <Label htmlFor="mem-name" className="text-sm font-medium text-slate-700 mb-1.5 block">
                      Full name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="mem-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mem-email" className="text-sm font-medium text-slate-700 mb-1.5 block">
                      Email address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="mem-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mem-phone" className="text-sm font-medium text-slate-700 mb-1.5 block">
                      Phone{' '}
                      <span className="text-slate-400 text-xs font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="mem-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+353 87 000 0000"
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>

                  {/* Optional monthly contribution (annual plan only) */}
                  {selected.id === 'annual' && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <HandCoins size={18} weight="duotone" className="text-amber-600" />
                          <span className="text-sm font-semibold text-slate-800">
                            Add a monthly contribution?
                          </span>
                        </div>
                        <Switch
                          checked={addMonthly}
                          onCheckedChange={setAddMonthly}
                          className="data-[state=checked]:bg-amber-500 h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Optional — billed monthly from next month until cancelled. Not charged today.</p>
                      {addMonthly && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {monthlyGivingAmounts.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setMonthlyAmount(amt)}
                              className={cn(
                                'rounded-xl border-2 py-2 text-sm font-semibold transition-all',
                                monthlyAmount === amt
                                  ? 'border-amber-500 bg-amber-100 text-amber-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300',
                              )}
                            >
                              €{amt}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => { setMonthlyAmount(0); setMonthlyCustom('') }}
                            className={cn(
                              'rounded-xl border-2 py-2 text-xs font-semibold transition-all',
                              monthlyAmount === 0
                                ? 'border-amber-500 bg-amber-100 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300',
                            )}
                          >
                            Custom
                          </button>
                        </div>
                      )}
                      {addMonthly && monthlyAmount === 0 && (
                        <div className="mt-2">
                          <Input
                            type="number"
                            value={monthlyCustom}
                            onChange={(e) => setMonthlyCustom(e.target.value)}
                            placeholder="Enter custom amount (€)"
                            min="1"
                            step="1"
                            autoFocus
                            className="h-9 rounded-xl border-amber-300 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* GDPR consent */}
                  <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <Checkbox
                      id="mem-gdpr"
                      checked={gdprConsent}
                      onCheckedChange={(v) => setGdprConsent(!!v)}
                      className="mt-0.5 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                    />
                    <Label htmlFor="mem-gdpr" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                      I consent to the Hindu Association of Ireland processing my personal data for
                      membership administration, in accordance with the{' '}
                      <a
                        href="/privacy-policy"
                        className="text-orange-600 underline hover:text-orange-700"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a
                        href="/terms-and-conditions"
                        className="text-orange-600 underline hover:text-orange-700"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Terms &amp; Conditions
                      </a>
                      . <span className="text-red-500">*</span>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-bold bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-2xl shadow-lg"
                  >
                    Continue to payment
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </form>
              </>
            )}

            {/* Step 2: Payment summary */}
            {step === 'payment' && selected && (
              <>
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0">
                      <CreditCard size={22} weight="duotone" className="text-orange-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-900">
                        Review &amp; Pay
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500">
                        Secure checkout via Stripe
                      </DialogDescription>
                    </div>
                  </div>
                  {/* Step indicator */}
                  <div className="flex gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-orange-500" />
                    <div className="flex-1 h-1 rounded-full bg-orange-500" />
                  </div>
                </DialogHeader>

                {/* Order summary */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Order Summary
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">{selected.name} membership</span>
                    <span className="font-semibold text-slate-900">€{selected.price}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Duration</span>
                    <span>{selected.durationLabel}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Member</span>
                    <span>{fullName}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Email</span>
                    <span className="truncate max-w-[180px]">{email}</span>
                  </div>
                  {addMonthly && (monthlyAmount > 0 || (monthlyAmount === 0 && !!monthlyCustom)) && (
                    <div className="pt-2 border-t border-amber-200 space-y-1">
                      <div className="flex justify-between text-xs text-amber-700">
                        <span>Monthly contribution</span>
                        <span>€{monthlyAmount > 0 ? monthlyAmount : monthlyCustom}/mo</span>
                      </div>
                      <p className="text-xs text-slate-400">Starts next month · charged monthly until cancelled · not charged today</p>
                    </div>
                  )}
                  <Separator className="bg-slate-200" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total today</span>
                    <span className="font-black text-xl text-orange-700">€{selected.price}</span>
                  </div>
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 p-3 mb-4">
                  <ShieldCheck size={15} weight="fill" className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">
                    You'll be redirected to Stripe's PCI-DSS certified checkout. Your card details are never stored on our servers.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setStep('details')}
                    className="h-12 rounded-xl border-slate-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={pay}
                    disabled={processing}
                    size="lg"
                    className="flex-1 h-12 font-bold bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-2xl"
                  >
                    {processing ? (
                      <>
                        <Spinner className="mr-2 animate-spin" />
                        Redirecting to Stripe…
                      </>
                    ) : (
                      <>
                        <Heart weight="fill" className="mr-2" />
                        Pay €{selected.price} with Stripe
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* ── Monthly Giving Dialog ──────────────────────────────────────────── */}
      <Dialog open={givingOpen} onOpenChange={(o) => { if (!o) closeGiving() }}>
        <DialogContent className="sm:max-w-[460px] bg-white p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          {givingTier && (() => {
            const { Icon } = givingTier
            return (
              <>
                <div className={cn('h-2 bg-linear-to-r', givingTier.gradient)} />
                <div className="p-8">
                  <DialogHeader className="mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-2xl bg-linear-to-br flex items-center justify-center shadow-sm shrink-0',
                          givingTier.gradient,
                        )}
                      >
                        <Icon size={24} weight="duotone" className="text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-bold text-slate-900">
                          {givingTier.name} — Monthly Giving
                        </DialogTitle>
                        <DialogDescription>
                          {givingTier.amount
                            ? `€${givingTier.amount}/month recurring`
                            : 'Custom monthly amount'}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <form onSubmit={payGiving} className="space-y-4">
                    {!givingTier.amount && (
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                          Monthly amount (€) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={givingCustom}
                          onChange={(e) => setGivingCustom(e.target.value)}
                          placeholder="Enter amount (min €1)"
                          min="1"
                          step="0.01"
                          required
                          className="h-11 rounded-xl"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="giving-name" className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Your name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="giving-name"
                        value={givingName}
                        onChange={(e) => setGivingName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="giving-email" className="text-sm font-medium text-slate-700 mb-1.5 block">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="giving-email"
                        type="email"
                        value={givingEmail}
                        onChange={(e) => setGivingEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <Checkbox
                        id="giving-gdpr"
                        checked={givingConsent}
                        onCheckedChange={(v) => setGivingConsent(!!v)}
                        className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label
                        htmlFor="giving-gdpr"
                        className="text-xs text-slate-600 leading-relaxed cursor-pointer"
                      >
                        I consent to my data being processed for donation management per the{' '}
                        <a
                          href="/privacy-policy"
                          className="text-orange-600 underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Privacy Policy
                        </a>
                        . <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={givingProcessing}
                      className={cn(
                        'w-full h-12 font-bold text-white rounded-2xl bg-linear-to-r',
                        givingTier.gradient,
                      )}
                    >
                      {givingProcessing ? (
                        <>
                          <Spinner className="mr-2 animate-spin" />
                          Redirecting…
                        </>
                      ) : (
                        <>
                          <Heart weight="fill" className="mr-2" />
                          Give{' '}
                          {givingTier.amount
                            ? `€${givingTier.amount}`
                            : givingCustom
                              ? `€${givingCustom}`
                              : ''
                          }/month
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

    </div>
  )
}



