import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, Crown, IdentificationCard } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MembersSection } from './MembersSection'
import { MembersDirectorySection } from './MembersDirectorySection'
import { MembershipPlansSection } from './MembershipPlansSection'

type MembershipTab = 'memberships' | 'people' | 'plans'

export function MembershipManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  let activeTab: MembershipTab = 'memberships'
  if (
    pathname.startsWith('/admin/membership/people') ||
    pathname.startsWith('/admin/membership/directory')
  ) {
    activeTab = 'people'
  } else if (pathname.startsWith('/admin/membership/plans')) {
    activeTab = 'plans'
  } else {
    activeTab = 'memberships'
  }

  useEffect(() => {
    if (pathname === '/admin/membership') {
      navigate('/admin/membership/memberships', { replace: true })
    }
  }, [pathname, navigate])

  const handleTabChange = (val: string) => {
    navigate(`/admin/membership/${val}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="memberships" className="gap-2 cursor-pointer">
          <Users size={16} weight="bold" /> Memberships
        </TabsTrigger>
        <TabsTrigger value="people" className="gap-2 cursor-pointer">
          <IdentificationCard size={16} weight="bold" /> People
        </TabsTrigger>
        <TabsTrigger value="plans" className="gap-2 cursor-pointer">
          <Crown size={16} weight="bold" /> Plans
        </TabsTrigger>
      </TabsList>
      <TabsContent value="memberships" className="mt-0">
        <MembersSection />
      </TabsContent>
      <TabsContent value="people" className="mt-0">
        <MembersDirectorySection />
      </TabsContent>
      <TabsContent value="plans" className="mt-0">
        <MembershipPlansSection />
      </TabsContent>
    </Tabs>
  )
}
