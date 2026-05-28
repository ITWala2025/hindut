import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Heart,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Spinner,
  ShieldCheck,
  X,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { SpecialCauseRow } from '@/hooks/useSpecialCauses'

interface CauseDonationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cause: Pick<SpecialCauseRow, 'id' | 'title' | 'description' | 'slug'>
}

export function CauseDonationDialog({ open, onOpenChange, cause }: CauseDonationDialogProps) {
  const [step, setStep] = useState<'amount' | 'details' | 'payment' | 'success'>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const presetAmounts = [10, 25, 50, 100, 250, 500]
  const getDonationAmount = () => selectedAmount || parseFloat(customAmount) || 0

  const handleAmountNext = () => {
    if (!getDonationAmount() || getDonationAmount() <= 0) {
      toast.error('Please select or enter a valid donation amount')
      return
    }
    setStep('details')
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!donorName || !donorEmail) {
      toast.error('Please provide your name and email')
      return
    }
    setStep('payment')
  }

  const handleStripePayment = async () => {
    const amount = getDonationAmount()
    if (amount <= 0) { toast.error('Invalid donation amount'); return }
    setIsProcessing(true)
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind:        'donation',
          amountEur:   amount,
          donorName,
          donorEmail,
          recurring,
          causeId:     cause.id,
          description: `Donation to: ${cause.title}`,
          successUrl:  `${window.location.origin}/donation-success`,
          cancelUrl:   `${window.location.origin}/causes/${cause.slug}?donation_cancelled=1`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Could not start Stripe checkout. Please try again.')
        setIsProcessing(false)
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Network error. Please check your connection and try again.')
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('amount')
      setSelectedAmount(null)
      setCustomAmount('')
      setDonorName('')
      setDonorEmail('')
      setRecurring(false)
    }, 300)
  }

  const handleBack = () => {
    if (step === 'details') setStep('amount')
    if (step === 'payment') setStep('details')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-gradient-to-br from-orange-50 via-white to-amber-50',
            'overflow-y-auto focus:outline-none',
            'inset-0 rounded-none px-6 pb-8 pt-14',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=open]:slide-in-from-bottom-full',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:slide-out-to-bottom-full',
            'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'lg:inset-auto lg:top-1/2 lg:left-1/2',
            'lg:-translate-x-1/2 lg:-translate-y-1/2',
            'lg:w-full lg:max-w-[550px] lg:max-h-[90vh]',
            'lg:rounded-2xl lg:shadow-2xl',
            'lg:border lg:border-orange-200/40',
            'lg:px-6 lg:pb-6 lg:pt-6',
            'lg:data-[state=open]:slide-in-from-bottom-0 lg:data-[state=open]:zoom-in-95',
            'lg:data-[state=closed]:slide-out-to-bottom-0 lg:data-[state=closed]:zoom-out-95',
            'lg:duration-200',
          )}
        >
          <DialogPrimitive.Close
            className={cn(
              'absolute top-4 right-4 z-10 rounded-lg p-1.5',
              'text-orange-600 opacity-70 transition-opacity hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
              'disabled:pointer-events-none',
            )}
          >
            <X size={20} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* ── Amount Step ─────────────────────────────────────────────── */}
          {step === 'amount' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl bg-linear-to-br from-orange-500 to-amber-600 p-3 glow-saffron">
                    <Heart className="text-white" size={28} weight="fill" />
                  </div>
                  <div>
                    <DialogTitle
                      className="text-xl text-orange-800 leading-tight"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {cause.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Choose your donation amount
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div>
                  <Label className="text-sm font-semibold mb-3 block text-orange-800">Select Amount</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {presetAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={selectedAmount === amount ? 'default' : 'outline'}
                        className={cn(
                          'h-14 text-lg font-semibold transition-all hover:scale-105',
                          selectedAmount === amount
                            ? 'bg-linear-to-r from-orange-600 to-amber-600 text-white shadow-lg glow-saffron'
                            : 'border-orange-300 text-orange-700 hover:border-orange-500',
                        )}
                        onClick={() => { setSelectedAmount(amount); setCustomAmount('') }}
                      >
                        €{amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="cause-custom-amount" className="text-sm font-semibold mb-2 block text-orange-800">
                    Or Enter Custom Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 font-semibold">€</span>
                    <Input
                      id="cause-custom-amount"
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                      className="pl-7 border-orange-300 focus:border-orange-500"
                      min="1"
                      step="0.01"
                    />
                  </div>
                </div>

                <label
                  htmlFor="cause-recurring"
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                    recurring ? 'border-orange-500 bg-orange-50' : 'border-orange-200 bg-white hover:bg-orange-50/60',
                  )}
                >
                  <Checkbox
                    id="cause-recurring"
                    checked={recurring}
                    onCheckedChange={(v) => setRecurring(v === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-orange-800">
                      Make this a monthly recurring donation
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      You will be charged €{getDonationAmount() || '—'} every month. Cancel any time.
                    </div>
                  </div>
                </label>

                <Button
                  onClick={handleAmountNext}
                  className="w-full h-12 text-base font-semibold bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron"
                >
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {/* ── Details Step ─────────────────────────────────────────────── */}
          {step === 'details' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="text-orange-700">
                    <ArrowLeft size={20} />
                  </Button>
                  <div>
                    <DialogTitle
                      className="text-2xl text-orange-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Your Information
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Donation amount: €{getDonationAmount()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleDetailsSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="cause-donor-name" className="text-sm font-semibold mb-2 block text-orange-800">
                    Your Name *
                  </Label>
                  <Input
                    id="cause-donor-name"
                    type="text"
                    placeholder="Enter your name"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="border-orange-300 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cause-donor-email" className="text-sm font-semibold mb-2 block text-orange-800">
                    Email Address *
                  </Label>
                  <Input
                    id="cause-donor-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="border-orange-300 focus:border-orange-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron"
                >
                  Continue to Payment
                </Button>
              </form>
            </>
          )}

          {/* ── Payment Step ─────────────────────────────────────────────── */}
          {step === 'payment' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="text-orange-700"
                    disabled={isProcessing}
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  <div>
                    <DialogTitle
                      className="text-2xl text-orange-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Complete Payment
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Donation: €{getDonationAmount()} · Stripe secure checkout
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="bg-white rounded-lg p-6 border-2 border-orange-200">
                  <p className="text-sm text-muted-foreground mb-4">
                    You will be redirected to Stripe's secure checkout to complete your €{getDonationAmount()}
                    {recurring ? ' monthly recurring' : ''} donation to{' '}
                    <strong className="text-orange-800">{cause.title}</strong>.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="text-orange-600 mt-1" size={20} weight="fill" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800">PCI-compliant payment</p>
                        <p className="text-xs text-muted-foreground">
                          Your card details are entered on Stripe's secure page — never on this site.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleStripePayment}
                    disabled={isProcessing}
                    className="w-full h-12 text-base font-semibold bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
                  >
                    {isProcessing ? (
                      <>
                        <Spinner className="mr-2 animate-spin" size={20} />
                        Redirecting to Stripe…
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2" size={20} />
                        Continue to Stripe · €{getDonationAmount()}{recurring ? '/mo' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Success Step (fallback — normally Stripe redirects away) ── */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-linear-to-br from-orange-100 to-amber-100 p-6 glow-saffron-intense">
                  <CheckCircle className="text-orange-600" size={64} weight="fill" />
                </div>
              </div>
              <div>
                <DialogTitle
                  className="text-2xl font-bold mb-2 text-orange-800"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Thank You for Your Generosity!
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-lg mb-2">
                  Donation: €{getDonationAmount()} to {cause.title}
                </DialogDescription>
                <p className="text-orange-700 mt-4 font-medium">
                  May you be blessed with peace and prosperity. 🙏
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron"
              >
                Close
              </Button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
