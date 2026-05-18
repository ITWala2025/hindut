import { useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LoginScreen } from '@/components/admin/LoginScreen'
import { AdminLayout, type AdminSectionId } from '@/components/admin/AdminLayout'
import { DashboardSection } from '@/components/admin/sections/DashboardSection'
import { EventsSection } from '@/components/admin/sections/EventsSection'
import { RsvpsSection } from '@/components/admin/sections/RsvpsSection'
import { MembersSection } from '@/components/admin/sections/MembersSection'
import { ReceiptsSection } from '@/components/admin/sections/ReceiptsSection'
import { MediaSection } from '@/components/admin/sections/MediaSection'
import { ServicesSection } from '@/components/admin/sections/ServicesSection'
import { UsersSection } from '@/components/admin/sections/UsersSection'
import { SettingsSection } from '@/components/admin/sections/SettingsSection'

/**
 * Admin portal entry point. Wraps the auth provider so the login gate
 * and the admin shell share session state, then dispatches to the
 * active section. Sections align with Plan/ADMIN_PORTAL.md.
 */
export function AdminPage() {
  return (
    <AuthProvider>
      <AdminPortal />
    </AuthProvider>
  )
}

function AdminPortal() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { section = 'dashboard' } = useParams<{ section: string }>()
  const activeSection = (section as AdminSectionId) || 'dashboard'

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  const handleNavigate = (id: AdminSectionId) => {
    navigate(`/admin/${id}`)
  }

  return (
    <AdminLayout active={activeSection} onNavigate={handleNavigate}>
      {renderSection(activeSection, handleNavigate)}
    </AdminLayout>
  )
}

function renderSection(
  section: AdminSectionId,
  navigate: (id: AdminSectionId) => void,
) {
  switch (section) {
    case 'dashboard':
      return <DashboardSection onNavigate={navigate} />
    case 'membership':
      return <MembersSection />
    case 'receipts':
      return <ReceiptsSection />
    case 'events':
      return <EventsSection />
    case 'rsvps':
      return <RsvpsSection />
    case 'media':
      return <MediaSection />
    case 'services':
      return <ServicesSection />
    case 'users':
      return <UsersSection />
    case 'settings':
      return <SettingsSection />
    default:
      return <DashboardSection onNavigate={navigate} />
  }
}
