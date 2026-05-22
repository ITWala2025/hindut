import { useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LoginScreen } from '@/components/admin/LoginScreen'
import { AdminLayout, type AdminSectionId } from '@/components/admin/AdminLayout'
import { DashboardSection } from '@/components/admin/sections/DashboardSection'
import { AnalyticsSection } from '@/components/admin/sections/AnalyticsSection'
import { EventsSection } from '@/components/admin/sections/EventsSection'
import { RsvpsSection } from '@/components/admin/sections/RsvpsSection'
import { TicketBookingsSection } from '@/components/admin/sections/TicketBookingsSection'
import { DonationsSection } from '@/components/admin/sections/DonationsSection'
import { MembersSection } from '@/components/admin/sections/MembersSection'
import { MembershipManagement } from '@/components/admin/sections/MembershipManagement'
import { ReceiptsSection } from '@/components/admin/sections/ReceiptsSection'
import { MediaSection } from '@/components/admin/sections/MediaSection'
import { ServicesSection } from '@/components/admin/sections/ServicesSection'
import { UsersSection } from '@/components/admin/sections/UsersSection'
import { RolesSection } from '@/components/admin/sections/RolesSection'
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

/**
 * Maps a sidebar section to the view-capability that gates it.
 * `dashboard` is always available; `roles` is super-admin-only and
 * enforced separately (returns null here).
 */
const SECTION_VIEW_CAPABILITY: Partial<Record<AdminSectionId, string>> = {
  analytics:  'analytics:view',
  membership: 'members:view',
  receipts:   'receipts:view',
  events:     'events:view',
  rsvps:      'rsvps:view',
  tickets:    'tickets:view',
  donations:  'donations:view',
  media:      'media:view',
  services:   'services:view',
  users:      'users:view',
  settings:   'settings:view',
}

function AdminPortal() {
  const { isAuthenticated, can, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const { section = 'dashboard' } = useParams<{ section: string }>()
  const activeSection = (section as AdminSectionId) || 'dashboard'

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  const handleNavigate = (id: AdminSectionId) => {
    navigate(`/admin/${id}`)
  }

  // Direct-URL access guard: redirect to Forbidden view if user lacks view perm.
  const requiredCap = SECTION_VIEW_CAPABILITY[activeSection]
  const allowed =
    activeSection === 'dashboard' ||
    (activeSection === 'roles' ? isSuperAdmin : !requiredCap || can(requiredCap as never))

  return (
    <AdminLayout active={activeSection} onNavigate={handleNavigate}>
      {allowed ? (
        renderSection(activeSection, handleNavigate)
      ) : (
        <ForbiddenView onBack={() => handleNavigate('dashboard')} />
      )}
    </AdminLayout>
  )
}

function ForbiddenView({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center">
      <h2 className="text-xl font-bold text-rose-900">Access denied</h2>
      <p className="mt-2 text-rose-800/80">
        Your role does not have permission to view this section. Contact a
        Super Admin to request access.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
      >
        Back to overview
      </button>
    </div>
  )
}

function renderSection(
  section: AdminSectionId,
  navigate: (id: AdminSectionId) => void,
) {
  switch (section) {
    case 'dashboard':
      return <DashboardSection onNavigate={navigate} />
    case 'analytics':
      return <AnalyticsSection />
    case 'membership':
      return <MembershipManagement />
    case 'receipts':
      return <ReceiptsSection />
    case 'events':
      return <EventsSection />
    case 'rsvps':
      return <RsvpsSection />
    case 'tickets':
      return <TicketBookingsSection />
    case 'donations':
      return <DonationsSection />
    case 'media':
      return <MediaSection />
    case 'services':
      return <ServicesSection />
    case 'users':
      return <UsersSection />
    case 'roles':
      return <RolesSection />
    case 'settings':
      return <SettingsSection />
    default:
      return <DashboardSection onNavigate={navigate} />
  }
}
