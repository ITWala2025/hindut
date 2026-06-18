import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Header } from '@/components/Header'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { Footer } from '@/components/Footer'
import { DonationDialog } from '@/components/DonationDialog'
// Core public pages — eagerly loaded (fast first-paint for common routes)
import { HomePage } from '@/components/pages/HomePage'
import { AboutPage } from '@/components/pages/AboutPage'
import { ServicesPage } from '@/components/pages/ServicesPage'
const ServiceDetailPage = lazy(() => import('@/components/pages/ServiceDetailPage').then(m => ({ default: m.ServiceDetailPage })))
import { EventsPage } from '@/components/pages/EventsPage'
import { MembershipPage } from '@/components/pages/MembershipPage'
import { ContactPage } from '@/components/pages/ContactPage'
// Admin + utility pages — lazily loaded (never needed for public visitors)
const AdminPage            = lazy(() => import('@/components/pages/AdminPage').then(m => ({ default: m.AdminPage })))
const CausesPage           = lazy(() => import('@/components/pages/CausesPage').then(m => ({ default: m.CausesPage })))
const CauseDetailPage      = lazy(() => import('@/components/pages/CauseDetailPage').then(m => ({ default: m.CauseDetailPage })))
const PrivacyPolicyPage    = lazy(() => import('@/components/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })))
const CookiesPolicyPage    = lazy(() => import('@/components/pages/CookiesPolicyPage').then(m => ({ default: m.CookiesPolicyPage })))
const TermsAndConditionsPage = lazy(() => import('@/components/pages/TermsAndConditionsPage').then(m => ({ default: m.TermsAndConditionsPage })))
const RefundPolicyPage     = lazy(() => import('@/components/pages/RefundPolicyPage').then(m => ({ default: m.RefundPolicyPage })))
const PaymentSuccessPage   = lazy(() => import('@/components/pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })))
const ActivateRolePage     = lazy(() => import('@/components/pages/ActivateRolePage').then(m => ({ default: m.ActivateRolePage })))
const EventDetailPage      = lazy(() => import('@/components/pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
const NewsPage             = lazy(() => import('@/components/pages/NewsPage').then(m => ({ default: m.NewsPage })))
const NewsDetailPage       = lazy(() => import('@/components/pages/NewsDetailPage').then(m => ({ default: m.NewsDetailPage })))
import { Toaster } from '@/components/ui/sonner'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { initAnalytics, trackPageView } from '@/lib/analytics'
import { useHasActiveCauses } from '@/hooks/useSpecialCauses'

/** Minimal full-page spinner shown while lazy chunks are loading */
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

/**
 * Fires a page-view (and time-on-page flush for the previous route) on every
 * route change for the public site. Skips /admin/* routes — we only track
 * public-facing traffic.
 */
function AnalyticsTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    initAnalytics()
    trackPageView(pathname + search)
  }, [pathname, search])
  return null
}

function AppShell() {
  const [isDonationOpen, setIsDonationOpen] = useState(false)
  const openDonation = () => setIsDonationOpen(true)
  const hasActiveCauses = useHasActiveCauses()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ScrollToTop />
        <Routes>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/:section" element={<AdminPage />} />
        </Routes>
        <Toaster />
      </Suspense>
    )
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <ScrollToTop />
      <AnalyticsTracker />
      <Header onDonateClick={openDonation} showCauses={hasActiveCauses} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage onDonateClick={openDonation} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<Suspense fallback={<PageLoader />}><ServiceDetailPage /></Suspense>} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<Suspense fallback={<PageLoader />}><EventDetailPage /></Suspense>} />
          <Route path="/news" element={<Suspense fallback={<PageLoader />}><NewsPage /></Suspense>} />
          <Route path="/news/:slug" element={<Suspense fallback={<PageLoader />}><NewsDetailPage /></Suspense>} />
          <Route path="/causes" element={<Suspense fallback={<PageLoader />}><CausesPage /></Suspense>} />
          <Route path="/causes/:slug" element={<Suspense fallback={<PageLoader />}><CauseDetailPage /></Suspense>} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicyPage /></Suspense>} />
          <Route path="/cookies-policy" element={<Suspense fallback={<PageLoader />}><CookiesPolicyPage /></Suspense>} />
          <Route path="/terms-and-conditions" element={<Suspense fallback={<PageLoader />}><TermsAndConditionsPage /></Suspense>} />
          <Route path="/refund-policy" element={<Suspense fallback={<PageLoader />}><RefundPolicyPage /></Suspense>} />
          <Route path="/donation-success" element={<Suspense fallback={<PageLoader />}><PaymentSuccessPage variant="donation" /></Suspense>} />
          <Route path="/membership-success" element={<Suspense fallback={<PageLoader />}><PaymentSuccessPage variant="membership" /></Suspense>} />
          <Route path="/ticket-success" element={<Suspense fallback={<PageLoader />}><PaymentSuccessPage variant="ticket" /></Suspense>} />
          <Route path="/rsvp-service-success" element={<Suspense fallback={<PageLoader />}><PaymentSuccessPage variant="rsvp_service" /></Suspense>} />
          <Route path="/activate-role" element={<Suspense fallback={<PageLoader />}><ActivateRolePage /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppButton />
      <DonationDialog open={isDonationOpen} onOpenChange={setIsDonationOpen} />
      <CookieConsentBanner />
      <Toaster />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
