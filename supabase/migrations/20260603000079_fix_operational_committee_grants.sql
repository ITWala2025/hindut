-- =============================================================================
-- Migration: 20260603000079_fix_operational_committee_grants.sql
-- Purpose : Add missing anon / authenticated / service_role grants on
--           operational_committee_members so the table is accessible via the
--           Supabase JS client (RLS still enforces row-level control).
-- =============================================================================

grant select                           on public.operational_committee_members to anon;
grant select, insert, update, delete   on public.operational_committee_members to authenticated;
grant select, insert, update, delete   on public.operational_committee_members to service_role;
