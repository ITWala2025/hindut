-- =============================================================================
-- Migration: 20260518000014_seed_admin_user.sql
-- Purpose : Grant admin access to a Supabase Auth user.
--           The user must already exist in Authentication → Users.
--           Run this in the Supabase SQL Editor after creating the auth user.
-- =============================================================================

-- Step 1: ensure the extra columns exist (idempotent, safe to re-run)
alter table public.user_roles
  add column if not exists full_name text,
  add column if not exists email     text;

-- Step 2: upsert the admin user
do $$
declare
  v_user_id uuid;
  v_email   text := 'admin@hindutemple.com';
begin
  -- Look up the auth user by email
  select id into v_user_id
  from auth.users
  where email = v_email;

  if v_user_id is null then
    raise exception
      'User "%" not found in auth.users. '
      'Create the user first via Authentication → Users in the Supabase dashboard.',
      v_email;
  end if;

  -- Upsert into user_roles — safe to re-run
  insert into public.user_roles (user_id, role, full_name, email)
  values (
    v_user_id,
    'admin',
    split_part(v_email, '@', 1),
    v_email
  )
  on conflict (user_id) do update
    set role      = 'admin',
        email     = excluded.email,
        full_name = coalesce(public.user_roles.full_name, excluded.full_name);

  raise notice 'Admin access granted to %  (user_id: %)', v_email, v_user_id;
end;
$$;
