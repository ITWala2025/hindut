import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { DonationDialog } from '@/components/DonationDialog'
import { HomePage } from '@/components/pages/HomePage'
import { AboutPage } from '@/components/pages/AboutPage'
import { ServicesPage } from '@/components/pages/ServicesPage'
import { ContactPage } from '@/components/pages/ContactPage'
import { EventsPage } from '@/components/pages/EventsPage'
import { MembershipPage } from '@/components/pages/MembershipPage'
import { AdminPage } from '@/components/pages/AdminPage'
import { PrivacyPolicyPage } from '@/components/pages/PrivacyPolicyPage'
import { CookiesPolicyPage } from '@/components/pages/CookiesPolicyPage'
import { TermsAndConditionsPage } from '@/components/pages/TermsAndConditionsPage'
import { RefundPolicyPage } from '@/components/pages/RefundPolicyPage'
import { Toaster } from '@/components/ui/sonner'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function AppShell() {
  const [isDonationOpen, setIsDonationOpen] = useState(false)
  const openDonation = () => setIsDonationOpen(true)
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return (
      <>
        <ScrollToTop />
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
        <Toaster />
      </>
    )
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <ScrollToTop />
      <Navigation onDonateClick={openDonation} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage onDonateClick={openDonation} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/cookies-policy" element={<CookiesPolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <DonationDialog open={isDonationOpen} onOpenChange={setIsDonationOpen} />
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
