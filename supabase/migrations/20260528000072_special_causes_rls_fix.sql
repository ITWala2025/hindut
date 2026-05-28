-- =============================================================================
-- Migration: 20260528000072_special_causes_rls_fix.sql
-- Purpose : Replace the 'for all' admin policy with explicit operation
--           policies to avoid RLS ambiguity, and ensure service_role access.
-- =============================================================================

-- Drop the combined policy and replace with explicit INSERT/UPDATE/DELETE
-- so there is no conflict with the staff_read SELECT policy.
drop policy if exists causes_admin_write on public.special_causes;

drop policy if exists causes_admin_insert on public.special_causes;
create policy causes_admin_insert on public.special_causes
  for insert
  with check (public.current_user_role() = 'admin');

drop policy if exists causes_admin_update on public.special_causes;
create policy causes_admin_update on public.special_causes
  for update
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists causes_admin_delete on public.special_causes;
create policy causes_admin_delete on public.special_causes
  for delete
  using (public.current_user_role() = 'admin');

-- Grant table access to authenticated role (RLS enforces row-level control)
grant select, insert, update, delete on public.special_causes to authenticated;
