import { useState } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LoginScreen } from '@/components/admin/LoginScreen'
import { AdminLayout, type AdminSectionId } from '@/components/admin/AdminLayout'
import { DashboardSection } from '@/components/admin/sections/DashboardSection'
import { EventsSection } from '@/components/admin/sections/EventsSection'
import { MembersSection } from '@/components/admin/sections/MembersSection'
import { ReceiptsSection } from '@/components/admin/sections/ReceiptsSection'
import { MediaSection } from '@/components/admin/sections/MediaSection'
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
  const [section, setSection] = useState<AdminSectionId>('dashboard')

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <AdminLayout active={section} onNavigate={setSection}>
      {renderSection(section, setSection)}
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
    case 'media':
      return <MediaSection />
    case 'users':
      return <UsersSection />
    case 'settings':
      return <SettingsSection />
    default:
      return <DashboardSection onNavigate={navigate} />
  }
}
