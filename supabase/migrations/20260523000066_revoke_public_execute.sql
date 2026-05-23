-- =============================================================================
-- Migration: 20260523000066_revoke_public_execute.sql
-- Purpose : REVOKE EXECUTE FROM PUBLIC on SECURITY DEFINER functions that
--           must not be callable via the PostgREST REST API by any role.
--
-- Context: Migration 000064 issued REVOKE … FROM anon, authenticated.
--          That removes explicit role grants but leaves the implicit PUBLIC
--          grant that PostgreSQL assigns to every new function by default.
--          The Supabase linter resolves privileges through PUBLIC, so the
--          warnings persisted. REVOKE … FROM PUBLIC is the correct fix.
--
-- Affected functions and why they must not be callable via REST:
--
--   auto_create_receipt_for_*  Trigger-only; called by triggers, not RPCs.
--                               SECURITY DEFINER but should never be invoked
--                               directly. Triggers fire regardless of EXECUTE
--                               permission — revoking from PUBLIC is safe.
--
--   list_admin_users           Now exclusively served through the admin-users
--   set_role_permissions       Netlify function (service_role). No REST RPC
--   set_user_role              path is needed or wanted.
--
--   rls_auto_enable            Internal maintenance function created by
--                               Supabase Studio; must not be publicly callable.
-- =============================================================================

revoke execute on function public.auto_create_receipt_for_donation()   from public;
revoke execute on function public.auto_create_receipt_for_membership() from public;
revoke execute on function public.auto_create_receipt_for_ticket()     from public;
revoke execute on function public.list_admin_users()                   from public;
revoke execute on function public.set_role_permissions(text, jsonb)    from public;
revoke execute on function public.set_user_role(uuid, text)            from public;

-- rls_auto_enable was created via Supabase Studio (not in migrations).
-- Guard so the migration stays idempotent in fresh environments.
do $$
begin
  if exists (
    select 1
    from   pg_proc p
    join   pg_namespace n on n.oid = p.pronamespace
    where  n.nspname = 'public'
    and    p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Note on auth_leaked_password_protection:
--   Enable via Supabase Dashboard → Auth → Settings → Password Security.
--   Cannot be changed through SQL.
-- ---------------------------------------------------------------------------
