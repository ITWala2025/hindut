-- ===========================================================================
-- Migration: site_settings — notification preferences + feature flags
--
-- Extends the site_settings singleton row with:
--   * notify_*  — which admin email alerts are active (recipient = org_email)
--   * feature_* — public-facing feature toggles, enforced on the live site
--
-- These were previously local-only React state in Admin → Settings and had
-- no effect whatsoever; this migration makes them real, persisted settings.
-- ===========================================================================

alter table public.site_settings
  add column if not exists notify_new_members    boolean not null default true,
  add column if not exists notify_donations       boolean not null default true,
  add column if not exists notify_weekly_digest   boolean not null default false,
  add column if not exists notify_security_alerts boolean not null default true,
  add column if not exists feature_public_events    boolean not null default true,
  add column if not exists feature_online_donations boolean not null default true,
  add column if not exists feature_member_signup    boolean not null default true,
  add column if not exists feature_maintenance_mode boolean not null default false;
