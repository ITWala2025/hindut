-- =============================================================================
-- Migration: 20260519000034_fix_event_rsvps_rls_insert.sql
-- Problem  : event_rsvps has RLS enabled but NO INSERT policy.
--            Although service_role has bypassrls and the
--            insert_rsvp_encrypted function is SECURITY DEFINER, the
--            actual row-security check depends on the function owner's
--            privileges, which may vary across Supabase plan tiers.
--            Belt-and-suspenders fix: add explicit INSERT and UPDATE
--            policies for service_role so the insert can never be blocked
--            by RLS regardless of owner/plan configuration.
-- =============================================================================

-- 1. Explicit INSERT policy for service_role ------------------------------
--    The rsvp-submit Netlify Function connects with the service_role key
--    and calls insert_rsvp_encrypted() via RPC. This policy ensures the
--    INSERT inside that function is always allowed even if the SECURITY
--    DEFINER owner-bypass is unavailable.
drop policy if exists event_rsvps_service_insert on public.event_rsvps;
create policy event_rsvps_service_insert on public.event_rsvps
  for insert
  to service_role
  with check (true);

-- 2. Explicit UPDATE policy for service_role ------------------------------
--    After the insert, rsvp-submit also does a direct table UPDATE to set
--    confirmation_sent_at. The existing admin-update policy only covers
--    the 'admin' app-user role; service_role needs its own policy.
drop policy if exists event_rsvps_service_update on public.event_rsvps;
create policy event_rsvps_service_update on public.event_rsvps
  for update
  to service_role
  using  (true)
  with check (true);

-- 3. Re-confirm table-level grants ----------------------------------------
--    Redundant with migration 28 but harmless — ensures service_role has
--    insert + update at the GRANT level as well as the policy level.
grant select, insert, update on public.event_rsvps to service_role;

-- 4. Pin function owner to postgres ---------------------------------------
--    postgres has bypassrls in all Supabase plans; this guarantees the
--    SECURITY DEFINER context also bypasses RLS when executing the function.
alter function public.insert_rsvp_encrypted(
  uuid, text, text, text, text, text, text, text, integer, integer, boolean, text
) owner to postgres;
