-- =============================================================================
-- Migration: 20260523000064_security_hardening.sql
-- Purpose : Resolve all Supabase security linter warnings:
--   1. Add SET search_path to trigger functions that lack it
--   2. Revoke anon/authenticated EXECUTE from SECURITY DEFINER functions
--      not meant to be called via the public REST API
--   3. Drop the overly-permissive memberships_public_insert RLS policy
--      (Stripe webhooks use service_role which bypasses RLS anyway)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix mutable search_path on trigger functions
--    These are SECURITY INVOKER triggers, not SECURITY DEFINER, so the risk
--    is lower — but fixing search_path is still best practice to prevent
--    accidental schema shadowing attacks.
-- ---------------------------------------------------------------------------
alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.generate_receipt_number()
  set search_path = public, pg_temp;

alter function public.notify_ticket_change()
  set search_path = public, pg_temp;

alter function public.notify_membership_change()
  set search_path = public, pg_temp;

alter function public.notify_donation_change()
  set search_path = public, pg_temp;

alter function public.auto_manage_event_published()
  set search_path = public, pg_temp;


-- ---------------------------------------------------------------------------
-- 2. Revoke anon EXECUTE from SECURITY DEFINER functions
--
--    Note: actual_user_role(), current_user_role(), and is_super_admin()
--    are intentionally kept callable by anon because RLS policies on
--    publicly readable tables call them to gate write access. Revoking from
--    anon would cause "permission denied" errors on those tables.
--    They are safe: all three call auth.uid() which returns NULL for anon,
--    so anon always receives null/false — no data is exposed.
-- ---------------------------------------------------------------------------
revoke execute on function public.list_admin_users()
  from anon;

revoke execute on function public.set_role_permissions(text, jsonb)
  from anon;

revoke execute on function public.set_user_role(uuid, text)
  from anon;

revoke execute on function public.auto_create_receipt_for_donation()
  from anon;

revoke execute on function public.auto_create_receipt_for_membership()
  from anon;

revoke execute on function public.auto_create_receipt_for_ticket()
  from anon;

-- rls_auto_enable was created via Supabase Studio (not in migrations).
-- Revoke conditionally so the migration is idempotent if the function
-- doesn't exist in a new environment.
do $$
begin
  if exists (
    select 1
    from   pg_proc p
    join   pg_namespace n on n.oid = p.pronamespace
    where  n.nspname = 'public'
    and    p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Revoke authenticated EXECUTE from functions not meant to be called
--    directly via /rest/v1/rpc by end-users.
--
--    - list_admin_users, set_role_permissions, set_user_role: now only
--      accessible through the admin-users Netlify function (service_role),
--      not directly from client-side JS. The functions contain their own
--      is_super_admin() guard, but removing REST API exposure is defence-
--      in-depth.
--    - auto_create_receipt_*: trigger-only; should never be invoked via RPC.
-- ---------------------------------------------------------------------------
revoke execute on function public.list_admin_users()
  from authenticated;

revoke execute on function public.set_role_permissions(text, jsonb)
  from authenticated;

revoke execute on function public.set_user_role(uuid, text)
  from authenticated;

revoke execute on function public.auto_create_receipt_for_donation()
  from authenticated;

revoke execute on function public.auto_create_receipt_for_membership()
  from authenticated;

revoke execute on function public.auto_create_receipt_for_ticket()
  from authenticated;


-- ---------------------------------------------------------------------------
-- 4. Drop memberships_public_insert RLS policy
--    WITH CHECK (true) for any authenticated/anon user is too permissive.
--    Memberships are created exclusively by the Stripe webhook, which runs
--    with service_role and bypasses RLS entirely. No policy is required.
-- ---------------------------------------------------------------------------
drop policy if exists memberships_public_insert on public.memberships;


-- ---------------------------------------------------------------------------
-- Notes on remaining warnings (not fixable via SQL):
--
--  • analytics_events / analytics_sessions insert/update WITH CHECK (true):
--    These are intentional — anonymous event tracking requires unrestricted
--    inserts from the Netlify analytics function. Accepted risk.
--
--  • public-gallery bucket SELECT policy allows listing:
--    Intentional — the gallery page enumerates bucket objects to render the
--    photo grid. Accepted risk.
--
--  • Leaked password protection disabled:
--    Must be enabled via: Supabase Dashboard → Auth → Settings → Password
--    Security → "Enable password breach detection". Cannot be set via SQL.
-- ---------------------------------------------------------------------------
