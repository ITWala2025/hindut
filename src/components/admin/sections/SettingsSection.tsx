import { useEffect, useState } from 'react'
import { FloppyDisk, Buildings, EnvelopeSimple, Globe, Bell, ShieldCheck, IdentificationCard } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { SectionCard } from '@/components/admin/adminUi'
import { StripePaymentsCard } from '@/components/admin/sections/StripePaymentsCard'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export function SettingsSection() {
  const { user, can } = useAuth()
  const canCreate = can('settings:create')
  const canUpdate = can('settings:update')
  const canDelete = can('settings:delete')
  const canWrite = canCreate || canUpdate || canDelete

  const [org, setOrg] = useState({
    name: 'Hindu Association of Ireland',
    email: 'community@hindutemple.ie',
    phone: '+353 87 495 3334',
    address: '4 Denmark Street, Co. Limerick, Ireland',
    description:
      'Hindu Association of Ireland (HAI) — a united platform working to establish a permanent Hindu Temple in Limerick to serve as a spiritual, cultural and community hub.',
  })

  const [trustId, setTrustId] = useState('')
  const [orgLoading, setOrgLoading] = useState(true)
  const [orgSaving, setOrgSaving] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('site_settings')
      .select('trust_id, org_name, org_email, org_phone, org_address, org_description, notify_new_members, notify_donations, notify_weekly_digest, notify_security_alerts, feature_public_events, feature_online_donations, feature_member_signup, feature_maintenance_mode')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('[Settings] failed to load organisation profile:', error.message)
          return
        }
        const row = data as {
          trust_id?: string | null
          org_name?: string | null
          org_email?: string | null
          org_phone?: string | null
          org_address?: string | null
          org_description?: string | null
          notify_new_members?: boolean | null
          notify_donations?: boolean | null
          notify_weekly_digest?: boolean | null
          notify_security_alerts?: boolean | null
          feature_public_events?: boolean | null
          feature_online_donations?: boolean | null
          feature_member_signup?: boolean | null
          feature_maintenance_mode?: boolean | null
        } | null
        if (!row) return
        setTrustId(row.trust_id ?? '')
        setOrg({
          name: row.org_name ?? '',
          email: row.org_email ?? '',
          phone: row.org_phone ?? '',
          address: row.org_address ?? '',
          description: row.org_description ?? '',
        })
        setNotifications({
          newMembers: row.notify_new_members ?? true,
          donations: row.notify_donations ?? true,
          weeklyDigest: row.notify_weekly_digest ?? false,
          securityAlerts: row.notify_security_alerts ?? true,
        })
        setFeatures({
          publicEvents: row.feature_public_events ?? true,
          onlineDonations: row.feature_online_donations ?? true,
          memberSignup: row.feature_member_signup ?? true,
          maintenanceMode: row.feature_maintenance_mode ?? false,
        })
      })
      .finally(() => {
        if (active) setOrgLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const saveOrgProfile = async () => {
    if (!canWrite) {
      toast.error("You don't have permission to change settings.")
      return
    }
    setOrgSaving(true)
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('site_settings')
        .update({
          trust_id:        trustId.trim() || null,
          org_name:        org.name.trim(),
          org_email:       org.email.trim(),
          org_phone:       org.phone.trim(),
          org_address:     org.address.trim(),
          org_description: org.description.trim(),
          updated_at:      new Date().toISOString(),
          updated_by:      authUser?.id ?? null,
        })
        .eq('id', 1)

      if (error) {
        console.error('[Settings] failed to save organisation profile:', error.message)
        toast.error('Failed to save organisation profile.')
        return
      }
      toast.success('Organisation profile saved.')
    } catch (err) {
      console.error('[Settings] failed to save organisation profile:', err)
      toast.error('Network error saving organisation profile.')
    } finally {
      setOrgSaving(false)
    }
  }

  const [notifications, setNotifications] = useState({
    newMembers: true,
    donations: true,
    weeklyDigest: false,
    securityAlerts: true,
  })
  const [notificationsSaving, setNotificationsSaving] = useState(false)

  const saveNotifications = async () => {
    if (!canWrite) {
      toast.error("You don't have permission to change settings.")
      return
    }
    setNotificationsSaving(true)
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          notify_new_members:     notifications.newMembers,
          notify_donations:       notifications.donations,
          notify_weekly_digest:   notifications.weeklyDigest,
          notify_security_alerts: notifications.securityAlerts,
          updated_at:             new Date().toISOString(),
        })
        .eq('id', 1)
      if (error) {
        console.error('[Settings] failed to save notification preferences:', error.message)
        toast.error('Failed to save notification preferences.')
        return
      }
      toast.success('Notification preferences saved.')
    } catch (err) {
      console.error('[Settings] failed to save notification preferences:', err)
      toast.error('Network error saving notification preferences.')
    } finally {
      setNotificationsSaving(false)
    }
  }

  const [features, setFeatures] = useState({
    publicEvents: true,
    onlineDonations: true,
    memberSignup: true,
    maintenanceMode: false,
  })

  const FEATURE_COLUMN = {
    publicEvents:    'feature_public_events',
    onlineDonations: 'feature_online_donations',
    memberSignup:    'feature_member_signup',
    maintenanceMode: 'feature_maintenance_mode',
  } as const

  const updateFeatureFlag = async (key: keyof typeof features, value: boolean) => {
    if (!canWrite) {
      toast.error("You don't have permission to change settings.")
      return
    }
    const previous = features[key]
    setFeatures({ ...features, [key]: value })
    const { error } = await supabase
      .from('site_settings')
      .update({ [FEATURE_COLUMN[key]]: value, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) {
      console.error('[Settings] failed to save feature flag:', error.message)
      toast.error('Failed to save feature flag.')
      setFeatures({ ...features, [key]: previous })
      return
    }
    toast.success('Feature flag updated.')
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Organisation profile"
        description="Public contact information shown on the website."
        actions={
          <Button
            onClick={() => void saveOrgProfile()}
            disabled={!canWrite || orgSaving || orgLoading}
            className="bg-linear-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
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
          <Field icon={<IdentificationCard size={16} />} label="Trust ID">
            <Input
              placeholder="e.g. CHY123456"
              value={trustId}
              disabled={orgLoading}
              onChange={(e) => setTrustId(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Shown to the public just below the logo name in the site header.
            </p>
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
          <Button variant="outline" onClick={() => void saveNotifications()} disabled={!canWrite || notificationsSaving || orgLoading}>
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

      <StripePaymentsCard canWrite={canWrite} />

      <SectionCard
        title="Feature flags"
        description="Toggle public-facing features. Use maintenance mode during deployments."
      >
        <div className="space-y-1">
          <ToggleRow
            title="Public events page"
            checked={features.publicEvents}
            onChange={(v) => void updateFeatureFlag('publicEvents', v)}
            disabled={!canWrite}
          />
          <ToggleRow
            title="Online donations"
            checked={features.onlineDonations}
            onChange={(v) => void updateFeatureFlag('onlineDonations', v)}
            disabled={!canWrite}
          />
          <ToggleRow
            title="Member sign-up"
            checked={features.memberSignup}
            onChange={(v) => void updateFeatureFlag('memberSignup', v)}
            disabled={!canWrite}
          />
          <ToggleRow
            title="Maintenance mode"
            description="Show a maintenance banner across the public site."
            checked={features.maintenanceMode}
            onChange={(v) => void updateFeatureFlag('maintenanceMode', v)}
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
            className={`h-16 w-16 rounded-full bg-linear-to-br ${user?.avatarColor ?? 'from-slate-400 to-slate-600'} text-white font-bold text-xl flex items-center justify-center`}
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
          <Button variant="outline" onClick={() => toast.info('Password change coming soon.')}>
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
