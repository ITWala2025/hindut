-- ===========================================================================
-- Migration: fix real organisation contact details in site_settings
--
-- The initial org_* column defaults (added in
-- 20260715000088_site_settings_org_profile.sql) were placeholder/mock values
-- copied from the admin UI's old local-state stub. The real contact details
-- were hardcoded separately in Footer.tsx / ContactPage.tsx. This migration
-- brings the singleton row in line with the real, live contact information
-- so the public site can read it from the database instead.
-- ===========================================================================

update public.site_settings
set org_name        = 'Hindu Association of Ireland',
    org_email        = 'community@hindutemple.ie',
    org_phone        = '+353 87 495 3334',
    org_address      = '4 Denmark Street, Co. Limerick, Ireland',
    org_description  = 'Hindu Association of Ireland (HAI) — a united platform working to establish a permanent Hindu Temple in Limerick to serve as a spiritual, cultural and community hub.'
where id = 1;

-- Keep the column defaults consistent too, in case the singleton row is
-- ever recreated.
alter table public.site_settings
  alter column org_email       set default 'community@hindutemple.ie',
  alter column org_phone       set default '+353 87 495 3334',
  alter column org_address     set default '4 Denmark Street, Co. Limerick, Ireland',
  alter column org_description set default 'Hindu Association of Ireland (HAI) — a united platform working to establish a permanent Hindu Temple in Limerick to serve as a spiritual, cultural and community hub.';
