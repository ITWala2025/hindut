import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  QrCode,
  Copy,
  Check,
  DownloadSimple,
  ShieldCheck,
  Sparkle,
  HandHeart,
  HandsClapping,
  BookOpen,
  Info,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { SeoMeta } from '@/lib/seo'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { cn } from '@/lib/utils'

interface DonatePageProps {
  onDonateClick: (amount?: number) => void
}

const PRESET_AMOUNTS = [
  { amount: 11, label: 'Aashirwad Seva', desc: 'Blessings & Prasad' },
  { amount: 21, label: 'Archana Seva', desc: 'Ritual Offering' },
  { amount: 51, label: 'Puja Seva', desc: 'Temple Puja Support' },
  { amount: 108, label: 'Auspicious Sankalp', desc: 'Sacred 108 Seva' },
  { amount: 251, label: 'Kalyana Seva', desc: 'Community & Culture' },
  { amount: 501, label: 'Maha Seva', desc: 'Major Mandir Patron' },
]

export function DonatePage({ onDonateClick }: DonatePageProps) {
  const settings = useSiteSettings()
  const [searchParams] = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [selectedQrPreset, setSelectedQrPreset] = useState<number | 'general'>('general')

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const [useLiveDomain, setUseLiveDomain] = useState(true)

  // In production, uses window.location.origin automatically.
  // On localhost, defaults to 'https://www.hindutemple.ie' so downloaded QR codes are immediately valid for flyers and print!
  const currentOrigin = (isLocal && useLiveDomain)
    ? 'https://www.hindutemple.ie'
    : (typeof window !== 'undefined' ? window.location.origin : 'https://www.hindutemple.ie')

  const donationUrl = selectedQrPreset === 'general'
    ? `${currentOrigin}/donate`
    : `${currentOrigin}/donate?amount=${selectedQrPreset}`

  // Generate QR Code image
  useEffect(() => {
    QRCode.toDataURL(donationUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#7C2D12', // Warm deep reddish-orange
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err))
  }, [donationUrl])

  // Trigger modal on page load if query param or default landing
  useEffect(() => {
    const amountParam = searchParams.get('amount')
    const parsedAmount = amountParam ? parseInt(amountParam, 10) : undefined
    if (parsedAmount && !isNaN(parsedAmount) && parsedAmount > 0) {
      onDonateClick(parsedAmount)
    } else {
      // Direct visit to /donate triggers the modal
      onDonateClick()
    }
  }, []) // run once on mount

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(donationUrl)
      setCopied(true)
      toast.success('Donation link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link to clipboard')
    }
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `HAI-Donation-QR-${selectedQrPreset === 'general' ? 'General' : `${selectedQrPreset}EUR`}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('QR Code image downloaded!')
  }

  return (
    <div className="min-h-screen bg-[#FEF6E4]/40 pt-28 pb-20">
      <SeoMeta
        title="Donate & Support Our Temple | Seva & Contributions"
        description="Support the Hindu Association of Ireland. Make a donation (Sankalp Seva) to sustain temple rituals, grand festivals, community welfare, and cultural education."
        canonical="/donate"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Top Breadcrumb / Badge */}
        <div className="text-center mb-6">
          <Badge variant="outline" className="border-orange-300/80 bg-orange-100/60 text-orange-800 px-3.5 py-1 text-xs tracking-wider uppercase font-semibold">
            🪔 Mandir Seva & Contribution
          </Badge>
        </div>

        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-950 tracking-tight leading-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Support Our Sacred Mission & Community
          </h1>
          <p className="text-base sm:text-lg text-orange-800/80 leading-relaxed">
            Your generous contributions enable daily pujas, Vedic rituals, festive celebrations, cultural classes, and community support across Ireland.
          </p>
        </div>

        {/* Main Donation Hub Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          {/* Left Column: Instant Donation Actions */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-orange-200/80 bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-linear-to-r from-orange-600 via-orange-500 to-amber-500 p-6 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                    Make a Contribution
                  </h2>
                  <p className="text-sm text-orange-100 mt-1">
                    Fast, secure checkout via Stripe • One-off or Recurring
                  </p>
                </div>
                <Button
                  onClick={() => onDonateClick()}
                  size="lg"
                  className="mt-4 sm:mt-0 bg-white text-orange-700 hover:bg-orange-50 font-bold shadow-md hover:shadow-lg transition-all"
                >
                  <Heart size={18} weight="fill" className="text-red-500 mr-2" />
                  Donate Now
                </Button>
              </div>

              <CardContent className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-700/80 mb-4">
                  Select a Sankalp Seva Preset:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_AMOUNTS.map(({ amount, label, desc }) => (
                    <button
                      key={amount}
                      onClick={() => onDonateClick(amount)}
                      type="button"
                      className="group text-left p-3.5 rounded-xl border border-orange-200/70 bg-orange-50/40 hover:bg-orange-100/70 hover:border-orange-400 hover:shadow-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl font-bold text-orange-900 group-hover:text-orange-700">
                          €{amount}
                        </span>
                        <Sparkle size={14} className="text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs font-semibold text-orange-800 leading-tight">
                        {label}
                      </div>
                      <div className="text-[11px] text-orange-600/75 mt-0.5 truncate">
                        {desc}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-orange-700/80 flex items-center gap-1.5">
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0" weight="fill" />
                    <span>256-bit encrypted Stripe checkout • Instant email receipt</span>
                  </div>
                  <Button
                    onClick={() => onDonateClick()}
                    variant="outline"
                    className="border-orange-300 text-orange-800 hover:bg-orange-100/60 w-full sm:w-auto"
                  >
                    Custom Amount
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tax Relief Info (Ireland Section 848A) */}
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-5 text-amber-950 flex gap-4">
              <div className="shrink-0 p-2.5 rounded-xl bg-amber-200/60 text-amber-800 h-fit">
                <Info size={22} weight="duotone" />
              </div>
              <div className="space-y-1 text-sm">
                <h3 className="font-bold text-amber-900">
                  Irish Tax Relief on Donations (Section 848A)
                </h3>
                <p className="text-amber-800/90 text-xs sm:text-sm leading-relaxed">
                  Under the Taxes Consolidation Act 1997, if you donate <strong>€250 or more</strong> in a calendar year, HAI can claim back the tax you paid on your donation at no extra cost to you, increasing your gift by up to <strong>44.9%</strong>.
                </p>
                {settings.trustId && (
                  <p className="text-xs text-amber-700 font-medium pt-1">
                    Registered Charity / Trust Reference: <strong>{settings.trustId}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live QR Code & Sharing Tool */}
          <div className="lg:col-span-5">
            <Card className="border-orange-200/80 bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-orange-100 text-orange-700 mb-3">
                <QrCode size={28} weight="duotone" />
              </div>
              <h2 className="text-xl font-bold text-orange-950" style={{ fontFamily: 'var(--font-heading)' }}>
                Scan to Donate
              </h2>
              <p className="text-xs text-orange-700/80 mt-1 max-w-sm mx-auto">
                Scan with your phone camera to open the donation form directly. Perfect for flyers, event stands, and sharing with family.
              </p>

              {/* QR Preset Tabs */}
              <div className="flex justify-center gap-1.5 mt-4 mb-3 flex-wrap">
                {(['general', 21, 51, 108] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedQrPreset(opt)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full font-medium transition-colors',
                      selectedQrPreset === opt
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-orange-100/60 text-orange-800 hover:bg-orange-200/70',
                    )}
                  >
                    {opt === 'general' ? 'General' : `€${opt}`}
                  </button>
                ))}
              </div>

              {/* QR Image Frame */}
              <div className="my-4 mx-auto w-56 h-56 p-3 bg-white rounded-2xl shadow-inner border border-orange-200 flex items-center justify-center relative group">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan to donate to Hindu Association of Ireland"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
                )}
              </div>

              {/* Action Buttons: Copy & Download */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-800 hover:bg-orange-100/60 text-xs font-semibold h-10"
                  >
                    {copied ? <Check size={16} className="text-emerald-600 mr-1.5" /> : <Copy size={16} className="mr-1.5" />}
                    {copied ? 'Link Copied' : 'Copy Route Link'}
                  </Button>

                  <Button
                    onClick={handleDownloadQr}
                    className="flex-1 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-semibold h-10 shadow-sm"
                  >
                    <DownloadSimple size={16} weight="bold" className="mr-1.5" />
                    Download QR
                  </Button>
                </div>

                {isLocal && (
                  <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
                    <span>Target URL: <strong>{useLiveDomain ? 'Live Production' : 'Localhost'}</strong></span>
                    <button
                      type="button"
                      onClick={() => setUseLiveDomain(!useLiveDomain)}
                      className="text-orange-700 underline font-semibold hover:text-orange-900"
                    >
                      Switch to {useLiveDomain ? 'Local' : 'Live'}
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 font-mono truncate px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  {donationUrl}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Sacred Seva Pillars */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-950" style={{ fontFamily: 'var(--font-heading)' }}>
              Where Your Seva Makes an Impact
            </h2>
            <p className="text-sm text-orange-700/80 mt-2">
              Every cent is allocated with strict transparency and devotion to community welfare.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-orange-200/60 bg-white/80 p-6 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                <HandHeart size={26} weight="duotone" />
              </div>
              <h3 className="font-bold text-base text-orange-900 mb-1.5">
                Temple Maintenance & Seva
              </h3>
              <p className="text-xs sm:text-sm text-orange-800/75 leading-relaxed">
                Daily archana, sacred offerings, flowers, prasad distribution, and sanctum upkeep.
              </p>
            </Card>

            <Card className="border-orange-200/60 bg-white/80 p-6 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Sparkle size={26} weight="duotone" />
              </div>
              <h3 className="font-bold text-base text-orange-900 mb-1.5">
                Festivals & Celebrations
              </h3>
              <p className="text-xs sm:text-sm text-orange-800/75 leading-relaxed">
                Organising grand celebrations for Diwali, Holi, Navratri, Maha Shivratri, and Janmashtami.
              </p>
            </Card>

            <Card className="border-orange-200/60 bg-white/80 p-6 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                <BookOpen size={26} weight="duotone" />
              </div>
              <h3 className="font-bold text-base text-orange-900 mb-1.5">
                Culture & Youth Learning
              </h3>
              <p className="text-xs sm:text-sm text-orange-800/75 leading-relaxed">
                Bal Vikas classes, Indian language programs, classical arts, and youth mentoring.
              </p>
            </Card>

            <Card className="border-orange-200/60 bg-white/80 p-6 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <HandsClapping size={26} weight="duotone" />
              </div>
              <h3 className="font-bold text-base text-orange-900 mb-1.5">
                Community & Elder Care
              </h3>
              <p className="text-xs sm:text-sm text-orange-800/75 leading-relaxed">
                Assisting international students, supporting elderly members, and humanitarian relief.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
