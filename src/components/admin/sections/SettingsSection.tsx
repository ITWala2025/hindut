import { useState } from 'react'
import { FloppyDisk, Buildings, EnvelopeSimple, Globe, Bell, ShieldCheck } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { SectionCard } from '@/components/admin/adminUi'
import { useAuth } from '@/lib/auth'

export function SettingsSection() {
  const { user, can } = useAuth()
  const canWrite = can('manageSettings')

  const [org, setOrg] = useState({
    name: 'Hindu Association of Ireland',
    email: 'info@hindut.ie',
    phone: '+353 89 000 0000',
    address: 'Ahane Hall, Limerick, Ireland',
    description:
      'A registered charity supporting the Hindu community across Ireland through worship, cultural events and community service.',
  })

  const [notifications, setNotifications] = useState({
    newMembers: true,
    donations: true,
    weeklyDigest: false,
    securityAlerts: true,
  })

  const [features, setFeatures] = useState({
    publicEvents: true,
    onlineDonations: true,
    memberSignup: true,
    maintenanceMode: false,
  })

  const save = (label: string) => {
    if (!canWrite) {
      toast.error("You don't have permission to change settings.")
      return
    }
    toast.success(`${label} saved.`)
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Organisation profile"
        description="Public contact information shown on the website."
        actions={
          <Button
            onClick={() => save('Organisation profile')}
            disabled={!canWrite}
            className="bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
          >
            <FloppyDisk className="mr-2" weight="bold" />
            Save changes
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={<Buildings size={16} />} label="Organisation name">
            <Input
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
            />
          </Field>
          <Field icon={<EnvelopeSimple size={16} />} label="Contact email">
            <Input
              type="email"
              value={org.email}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
            />
          </Field>
          <Field icon={<Globe size={16} />} label="Phone">
            <Input
              value={org.phone}
              onChange={(e) => setOrg({ ...org, phone: e.target.value })}
            />
          </Field>
          <Field icon={<Buildings size={16} />} label="Address">
            <Input
              value={org.address}
              onChange={(e) => setOrg({ ...org, address: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="About">
              <Textarea
                rows={3}
                value={org.description}
                onChange={(e) => setOrg({ ...org, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Notifications"
        description="Choose which email alerts you want to receive."
        actions={
          <Button variant="outline" onClick={() => save('Notification preferences')}>
            <Bell className="mr-2" />
            Save preferences
          </Button>
        }
      >
        <div className="space-y-1">
          <ToggleRow
            title="New member sign-ups"
            description="Email me when a new member joins the temple."
            checked={notifications.newMembers}
            onChange={(v) => setNotifications({ ...notifications, newMembers: v })}
          />
          <ToggleRow
            title="Donations"
            description="Notify me of every donation received."
            checked={notifications.donations}
            onChange={(v) => setNotifications({ ...notifications, donations: v })}
          />
          <ToggleRow
            title="Weekly digest"
            description="A Monday-morning summary of the previous week's activity."
            checked={notifications.weeklyDigest}
            onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
          />
          <ToggleRow
            title="Security alerts"
            description="Failed logins, role changes and other security events."
            checked={notifications.securityAlerts}
            onChange={(v) => setNotifications({ ...notifications, securityAlerts: v })}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Feature flags"
        description="Toggle public-facing features. Use maintenance mode during deployments."
      >
        <div className="space-y-1">
          <ToggleRow
            title="Public events page"
            checked={features.publicEvents}
            onChange={(v) => setFeatures({ ...features, publicEvents: v })}
            disabled={!canWrite}
          />
          <ToggleRow
            title="Online donations"
            checked={features.onlineDonations}
            onChange={(v) => setFeatures({ ...features, onlineDonations: v })}
            disabled={!canWrite}
          />
          <ToggleRow
            title="Member sign-up"
            checked={features.memberSignup}
            onChange={(v) => setFeatures({ ...features, memberSignup: v })}
            disabled={!canWrite}
          />
          <ToggleRow
            title="Maintenance mode"
            description="Show a maintenance banner across the public site."
            checked={features.maintenanceMode}
            onChange={(v) => setFeatures({ ...features, maintenanceMode: v })}
            disabled={!canWrite}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Your account"
        description="Profile details for the signed-in user."
      >
        <div className="flex items-center gap-4">
          <div
            className={`h-16 w-16 rounded-full bg-gradient-to-br ${user?.avatarColor ?? 'from-slate-400 to-slate-600'} text-white font-bold text-xl flex items-center justify-center`}
          >
            {user?.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900 text-lg">{user?.name}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="text-xs flex items-center gap-1 text-orange-700 mt-1">
              <ShieldCheck size={14} weight="fill" />
              Role: {user?.role.replace('_', ' ')}
            </div>
          </div>
          <Button variant="outline" onClick={() => toast.info('Password change is mocked in Phase 1.')}>
            Change password
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

function Field({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        {icon && <span className="text-orange-600">{icon}</span>}
        {label}
      </Label>
      {children}
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div>
        <div className="font-semibold text-slate-900 text-sm">{title}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}
