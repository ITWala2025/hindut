-- =============================================================================
-- Migration: 20260523000065_security_hardening_2.sql
-- Purpose : Resolve remaining Supabase security linter warnings not fully
--           addressed in 20260523000064:
--
--   1. Convert actual_user_role / current_user_role / is_super_admin from
--      SECURITY DEFINER to SECURITY INVOKER — eliminates both the
--      anon_security_definer and authenticated_security_definer linter
--      entries for these three functions. They remain correct because
--      auth.uid() reads from the JWT session variable (request.jwt.claims),
--      not from the PostgreSQL execution identity, so SECURITY INVOKER does
--      not change the role-resolution result.
--
--   2. Drop overly-permissive analytics INSERT/UPDATE RLS policies and
--      revoke the corresponding table-level grants from anon/authenticated.
--      All analytics writes are performed by the analytics-track Netlify
--      function which runs with the service_role key and bypasses RLS.
--
--   3. Drop the public-gallery storage listing policy. The bucket is public
--      so objects are always accessible via direct URL
--      (/storage/v1/object/public/public-gallery/…). The app constructs
--      URLs via getPublicUrl() and never calls storage.list(); dropping the
--      SELECT policy removes the bucket-listing exposure without affecting
--      the gallery.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Grant SELECT on user_roles to anon so SECURITY INVOKER functions that
--    read this table work when called from RLS policies on anon-accessible
--    tables. The existing self-read RLS policy
--    (USING user_id = auth.uid()) guarantees anon always sees zero rows.
-- ---------------------------------------------------------------------------
grant select on public.user_roles to anon;


-- ---------------------------------------------------------------------------
-- 2. Redefine role-helper functions as SECURITY INVOKER
--    (remove SECURITY DEFINER — INVOKER is the default).
--    Existing EXECUTE grants to anon and authenticated are preserved so RLS
--    policies that call these functions continue to work.
-- ---------------------------------------------------------------------------

-- Raw role (super_admin / admin / editor / null)
create or replace function public.actual_user_role()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

-- For RLS: maps super_admin → 'admin' so 40+ existing policies keep working.
create or replace function public.current_user_role()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select case
           when role = 'super_admin' then 'admin'
           else role
         end
  from public.user_roles
  where user_id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role = 'super_admin' from public.user_roles where user_id = auth.uid()),
    false
  );
$$;

-- Keep existing grants (needed for anon/authenticated to call via RLS)
grant execute on function public.actual_user_role()  to anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_super_admin()    to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. Drop permissive analytics INSERT/UPDATE policies.
--    All analytics writes go through the analytics-track Netlify function
--    which uses the service_role key — RLS is bypassed for those writes.
--    Anon and authenticated users must not write directly to these tables.
-- ---------------------------------------------------------------------------

drop policy if exists analytics_events_insert_any  on public.analytics_events;
drop policy if exists analytics_sessions_insert_any on public.analytics_sessions;
drop policy if exists analytics_sessions_update_any on public.analytics_sessions;

-- Revoke the table-level INSERT/UPDATE grants that were paired with those
-- policies (admins/editors still have full access via service_role).
revoke insert         on public.analytics_events   from anon, authenticated;
revoke insert, update on public.analytics_sessions from anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. Drop the public-gallery storage listing SELECT policy.
--    Objects in a public bucket are accessible by direct URL without any
--    RLS SELECT policy. Dropping this policy prevents API-level bucket
--    enumeration while leaving image URL access completely unaffected.
-- ---------------------------------------------------------------------------
drop policy if exists "public-gallery read" on storage.objects;
