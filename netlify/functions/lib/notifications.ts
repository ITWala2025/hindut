/**
 * netlify/functions/lib/notifications.ts
 *
 * Admin email-alert preferences, stored in the `site_settings` singleton
 * row and editable in Admin → Settings → Notifications. The recipient is
 * always the organisation's contact email (`site_settings.org_email`).
 *
 * Usage:
 *   await notifyAdmin('donations', {
 *     subject: 'New donation received',
 *     html:    '<p>...</p>',
 *     text:    '...',
 *   })
 *
 * Silently no-ops (and logs) if mail isn't configured or the preference is
 * turned off — callers never need to wrap this in their own try/catch for
 * that purpose, though it's still safe to do so.
 */

import { supabaseAdmin } from './stripe.js'
import { sendMail, isMailConfigured } from './mailer.js'

export type NotificationKind = 'newMembers' | 'donations' | 'weeklyDigest' | 'securityAlerts'

interface SiteSettingsNotifyRow {
  org_email?:               string | null
  notify_new_members?:      boolean | null
  notify_donations?:        boolean | null
  notify_weekly_digest?:    boolean | null
  notify_security_alerts?:  boolean | null
}

/** Fetch the current notification preferences + recipient address. */
export async function getNotificationSettings(): Promise<{
  orgEmail: string
  flags: Record<NotificationKind, boolean>
}> {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('site_settings')
    .select('org_email, notify_new_members, notify_donations, notify_weekly_digest, notify_security_alerts')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('[notifications] failed to load site_settings:', error.message)
  }
  const row = (data as SiteSettingsNotifyRow | null) ?? {}
  return {
    orgEmail: row.org_email || 'community@hindutemple.ie',
    flags: {
      newMembers:     row.notify_new_members     ?? true,
      donations:      row.notify_donations        ?? true,
      weeklyDigest:   row.notify_weekly_digest     ?? false,
      securityAlerts: row.notify_security_alerts   ?? true,
    },
  }
}

/**
 * Send an admin notification email if the given preference is enabled.
 * Returns true if an email was actually sent.
 */
export async function notifyAdmin(
  kind: NotificationKind,
  msg: { subject: string; html: string; text: string },
): Promise<boolean> {
  if (!isMailConfigured()) return false

  const { orgEmail, flags } = await getNotificationSettings()
  if (!flags[kind]) return false

  try {
    await sendMail({
      from:    '"Hindu Association of Ireland" <community@hindutemple.ie>',
      to:      orgEmail,
      subject: msg.subject,
      html:    msg.html,
      text:    msg.text,
    })
    console.log(`[notifications] ${kind} alert sent to`, orgEmail)
    return true
  } catch (err) {
    console.error(`[notifications] failed to send ${kind} alert:`, err)
    return false
  }
}
