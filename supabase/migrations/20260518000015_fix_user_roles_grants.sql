-- =============================================================================
-- Migration: 20260518000015_fix_user_roles_grants.sql
-- Purpose : Grant table-level SELECT permission on user_roles to authenticated
--           role. RLS policies alone are not enough — the role also needs
--           table-level GRANT before RLS is evaluated.
-- =============================================================================

-- Allow authenticated users to read user_roles (RLS still filters to own row)
grant select on public.user_roles to authenticated;

-- Allow service_role full access (needed for list_admin_users() RPC)
grant all on public.user_roles to service_role;
