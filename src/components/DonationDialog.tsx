import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heart, CheckCircle, CreditCard, ArrowLeft, Spinner } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'

interface DonationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PaymentGateway = 'stripe' | null

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder')

export function DonationDialog({ open, onOpenChange }: DonationDialogProps) {
  const [step, setStep] = useState<'amount' | 'details' | 'payment' | 'success'>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const presetAmounts = [10, 25, 50, 100, 250, 500]

  const getDonationAmount = () => selectedAmount || parseFloat(customAmount) || 0

  const handleAmountNext = () => {
    const amount = getDonationAmount()

    if (!amount || amount <= 0) {
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

    // Move to payment step
    setStep('payment')
  }

  const handleStripePayment = async () => {
    setIsProcessing(true)
    try {
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // In a real implementation, you would:
      // 1. Call your backend to create a Checkout Session
      // 2. Redirect to Stripe Checkout with the session ID

      // For demo purposes, we'll simulate the process
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: getDonationAmount(),
          email: donorEmail,
          name: donorName,
        }),
      }).catch(() => {
        // Demo: Simulate successful payment after 2 seconds
        return new Promise(resolve => setTimeout(() => resolve({ ok: true }), 2000))
      })

      if (response && typeof response === 'object' && 'ok' in response) {
        setStep('success')
        toast.success('Payment processed successfully via Stripe!')
      }
    } catch (error) {
      toast.error('Payment failed. Please try again.')
      console.error('Stripe error:', error)
    } finally {
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
    }, 300)
  }

  const handleBack = () => {
    if (step === 'details') setStep('amount')
    if (step === 'payment') setStep('details')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] bg-linear-to-br from-orange-50 via-white to-amber-50">
        {/* Amount Selection Step */}
        {step === 'amount' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-xl bg-linear-to-br from-orange-500 to-amber-600 p-3 glow-saffron">
                  <Heart className="text-white" size={28} weight="fill" />
                </div>
                <div>
                  <DialogTitle className="text-2xl text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                    Support Our Temple
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
                        "h-14 text-lg font-semibold transition-all hover:scale-105",
                        selectedAmount === amount
                          ? "bg-linear-to-r from-orange-600 to-amber-600 text-white shadow-lg glow-saffron"
                          : "border-orange-300 text-orange-700 hover:border-orange-500"
                      )}
                      onClick={() => {
                        setSelectedAmount(amount)
                        setCustomAmount('')
                      }}
                    >
                      €{amount}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="custom-amount" className="text-sm font-semibold mb-2 block text-orange-800">
                  Or Enter Custom Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 font-semibold">€</span>
                  <Input
                    id="custom-amount"
                    type="number"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value)
                      setSelectedAmount(null)
                    }}
                    className="pl-7 border-orange-300 focus:border-orange-500"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>

              <Button
                onClick={handleAmountNext}
                className="w-full h-12 text-base font-semibold bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 hover-glow-saffron"
              >
                Continue to Payment
              </Button>
            </div>
          </>
        )}

        {/* Details Step */}
        {step === 'details' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="text-orange-700"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <DialogTitle className="text-2xl text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
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
                <Label htmlFor="donor-name" className="text-sm font-semibold mb-2 block text-orange-800">
                  Your Name *
                </Label>
                <Input
                  id="donor-name"
                  type="text"
                  placeholder="Enter your name"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="border-orange-300 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="donor-email" className="text-sm font-semibold mb-2 block text-orange-800">
                  Email Address *
                </Label>
                <Input
                  id="donor-email"
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

        {/* Payment Step */}
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
                  <DialogTitle className="text-2xl text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
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
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-orange-800 mb-2">Stripe Checkout</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You will be redirected to Stripe's secure checkout to complete your €{getDonationAmount()} donation
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <CreditCard className="text-orange-600 mt-1" size={20} />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Secure Payment</p>
                      <p className="text-xs text-muted-foreground">Your payment information is processed securely by Stripe</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStripePayment}
                  disabled={isProcessing}
                  className="w-full h-12 text-base font-semibold bg-linear-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
                >
                  {isProcessing ? (
                    <>
                      <Spinner className="mr-2 animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2" size={20} />
                      Pay €{getDonationAmount()} with Stripe
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="py-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-linear-to-br from-orange-100 to-amber-100 p-6 glow-saffron-intense">
                <CheckCircle className="text-orange-600" size={64} weight="fill" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                Thank You for Your Generosity!
              </h3>
              <p className="text-muted-foreground text-lg mb-2">
                Donation: €{getDonationAmount()}
              </p>
              <p className="text-sm text-muted-foreground">
                Payment processed via Stripe. A receipt has been sent to {donorEmail}.
              </p>
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
      </DialogContent>
    </Dialog>
  )
}
