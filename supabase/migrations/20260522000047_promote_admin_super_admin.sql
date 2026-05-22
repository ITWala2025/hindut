-- =============================================================================
-- Migration: 20260522000047_promote_admin_super_admin.sql
-- Purpose : Promote admin@hindutemple.com to super_admin.
--           Idempotent: safe to re-run.
-- =============================================================================

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'admin@hindutemple.com'
  limit 1;

  if v_user_id is null then
    raise notice 'No auth.users row found for admin@hindutemple.com. Skipping.';
    return;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'super_admin')
  on conflict (user_id) do update set role = 'super_admin';

  raise notice 'Promoted admin@hindutemple.com (%) to super_admin.', v_user_id;
end$$;
