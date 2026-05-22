import { Users, Crown, IdentificationCard } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MembersSection } from './MembersSection'
import { MembersDirectorySection } from './MembersDirectorySection'
import { MembershipPlansSection } from './MembershipPlansSection'

export function MembershipManagement() {
  return (
    <Tabs defaultValue="memberships" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="memberships" className="gap-2">
          <Users size={16} weight="bold" /> Memberships
        </TabsTrigger>
        <TabsTrigger value="people" className="gap-2">
          <IdentificationCard size={16} weight="bold" /> People
        </TabsTrigger>
        <TabsTrigger value="plans" className="gap-2">
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
