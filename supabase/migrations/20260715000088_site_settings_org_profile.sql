-- ===========================================================================
-- Migration: site_settings — organisation profile fields
--
-- Extends the site_settings singleton row (created in
-- 20260715000087_create_site_settings.sql) with the public organisation
-- profile fields shown/edited in Admin → Settings → Organisation profile.
-- These were previously only held in local React state and never persisted.
-- ===========================================================================

alter table public.site_settings
  add column if not exists org_name        text not null default 'Hindu Association of Ireland',
  add column if not exists org_email       text not null default 'info@hindut.ie',
  add column if not exists org_phone       text not null default '+353 89 000 0000',
  add column if not exists org_address     text not null default 'Ahane Hall, Limerick, Ireland',
  add column if not exists org_description text not null default 'A registered charity supporting the Hindu community across Ireland through worship, cultural events and community service.';
