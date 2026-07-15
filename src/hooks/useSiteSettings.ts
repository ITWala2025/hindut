import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SiteSettings {
  trustId: string | null
  orgName: string
  orgEmail: string
  orgPhone: string
  orgAddress: string
  orgDescription: string
  featurePublicEvents: boolean
  featureOnlineDonations: boolean
  featureMemberSignup: boolean
  featureMaintenanceMode: boolean
}

const DEFAULT_SETTINGS: SiteSettings = {
  trustId: null,
  orgName: 'Hindu Association of Ireland',
  orgEmail: 'community@hindutemple.ie',
  orgPhone: '+353 87 495 3334',
  orgAddress: '4 Denmark Street, Co. Limerick, Ireland',
  orgDescription:
    'Hindu Association of Ireland (HAI) — a united platform working to establish a permanent Hindu Temple in Limerick to serve as a spiritual, cultural and community hub.',
  featurePublicEvents: true,
  featureOnlineDonations: true,
  featureMemberSignup: true,
  featureMaintenanceMode: false,
}

interface SiteSettingsRow {
  trust_id?: string | null
  org_name?: string | null
  org_email?: string | null
  org_phone?: string | null
  org_address?: string | null
  org_description?: string | null
  feature_public_events?: boolean | null
  feature_online_donations?: boolean | null
  feature_member_signup?: boolean | null
  feature_maintenance_mode?: boolean | null
}

/**
 * Public organisation profile (name, contact details, trust ID) managed by
 * admins in Settings → Organisation profile. Falls back to sane defaults
 * while loading or if the row can't be read.
 */
export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let active = true
    supabase
      .from('site_settings')
      .select('trust_id, org_name, org_email, org_phone, org_address, org_description, feature_public_events, feature_online_donations, feature_member_signup, feature_maintenance_mode')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('[useSiteSettings] failed to load site settings:', error.message)
          return
        }
        const row = data as SiteSettingsRow | null
        if (!row) return
        setSettings({
          trustId: row.trust_id ?? null,
          orgName: row.org_name || DEFAULT_SETTINGS.orgName,
          orgEmail: row.org_email || DEFAULT_SETTINGS.orgEmail,
          orgPhone: row.org_phone || DEFAULT_SETTINGS.orgPhone,
          orgAddress: row.org_address || DEFAULT_SETTINGS.orgAddress,
          orgDescription: row.org_description || DEFAULT_SETTINGS.orgDescription,
          featurePublicEvents: row.feature_public_events ?? DEFAULT_SETTINGS.featurePublicEvents,
          featureOnlineDonations: row.feature_online_donations ?? DEFAULT_SETTINGS.featureOnlineDonations,
          featureMemberSignup: row.feature_member_signup ?? DEFAULT_SETTINGS.featureMemberSignup,
          featureMaintenanceMode: row.feature_maintenance_mode ?? DEFAULT_SETTINGS.featureMaintenanceMode,
        })
      })
    return () => {
      active = false
    }
  }, [])

  return settings
}
