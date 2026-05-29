-- =============================================================================
-- Migration: 20260529000073_special_causes_anon_grant.sql
-- Purpose : Grant table-level SELECT to anon so the existing RLS policy
--           causes_public_read (status IN active/paused/closed) can take
--           effect for unauthenticated visitors (e.g. header active-cause
--           check, public causes listing).
-- =============================================================================

grant select on public.special_causes to anon;
