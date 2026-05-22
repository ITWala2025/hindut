-- =============================================================================
-- Migration: 20260522000045_create_rbac_permissions.sql
-- Purpose : Granular RBAC. Introduces a new `super_admin` role plus a
--           role_permissions table that lets a super_admin grant or revoke
--           per-module CRUD capabilities for the `admin` and `editor` roles.
--           super_admin always has every permission and cannot be downgraded
--           by anyone except another super_admin.
--
-- Backwards-compatibility: existing RLS policies all use
-- `public.current_user_role() = 'admin'`. We deliberately keep that contract
-- by mapping super_admin -> 'admin' inside `current_user_role()` so the new
-- role inherits every existing admin-only data permission without rewriting
-- 40+ policies. The raw role (super_admin / admin / editor) is still
-- queryable via `public.actual_user_role()` for the admin UI and for
-- `is_super_admin()` checks.
-- =============================================================================

-- 1. Allow 'super_admin' in the role check constraint --------------------------
alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('super_admin', 'admin', 'editor'));

-- 2. Helper functions ---------------------------------------------------------
-- Raw role (super_admin / admin / editor / null).
create or replace function public.actual_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

grant execute on function public.actual_user_role() to anon, authenticated;

-- For RLS: returns 'admin' for both 'admin' AND 'super_admin' so existing
-- policies keep working without modification.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when role = 'super_admin' then 'admin'
           else role
         end
  from public.user_roles
  where user_id = auth.uid();
$$;

grant execute on function public.current_user_role() to anon, authenticated;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' from public.user_roles where user_id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_super_admin() to anon, authenticated;

-- 3. role_permissions table ---------------------------------------------------
-- Stores the per-role capability map for 'admin' and 'editor'. super_admin
-- is intentionally NOT in this table — they always have every capability.
-- The `permissions` jsonb is shaped as
--   { "<module>": { "view": bool, "create": bool, "update": bool, "delete": bool } }
create table if not exists public.role_permissions (
  role        text primary key check (role in ('admin', 'editor')),
  permissions jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.role_permissions enable row level security;

-- Every authenticated user reads the table so the app can resolve their
-- effective permissions client-side. Writes are super_admin only.
drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions
  for select
  to authenticated
  using (true);

drop policy if exists role_permissions_super_admin_write on public.role_permissions;
create policy role_permissions_super_admin_write on public.role_permissions
  for all
  to authenticated
  using  (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.role_permissions to authenticated;

-- 4. Seed defaults -----------------------------------------------------------
-- Admin: full CRUD on every module except role/permission management itself
-- (which remains super_admin-only).
-- Editor: read everywhere; create/update on content modules (events, media,
-- services); no destructive privileges.
insert into public.role_permissions (role, permissions) values
  ('admin', jsonb_build_object(
     'analytics',  jsonb_build_object('view', true,  'create', false, 'update', false, 'delete', false),
     'members',    jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', true),
     'receipts',   jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', true),
     'events',     jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', true),
     'rsvps',      jsonb_build_object('view', true,  'create', false, 'update', true,  'delete', true),
     'tickets',    jsonb_build_object('view', true,  'create', false, 'update', true,  'delete', true),
     'donations',  jsonb_build_object('view', true,  'create', false, 'update', true,  'delete', true),
     'media',      jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', true),
     'services',   jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', true),
     'users',      jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', true),
     'settings',   jsonb_build_object('view', true,  'create', false, 'update', true,  'delete', false)
  )),
  ('editor', jsonb_build_object(
     'analytics',  jsonb_build_object('view', true,  'create', false, 'update', false, 'delete', false),
     'members',    jsonb_build_object('view', false, 'create', false, 'update', false, 'delete', false),
     'receipts',   jsonb_build_object('view', false, 'create', false, 'update', false, 'delete', false),
     'events',     jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', false),
     'rsvps',      jsonb_build_object('view', true,  'create', false, 'update', false, 'delete', false),
     'tickets',    jsonb_build_object('view', true,  'create', false, 'update', false, 'delete', false),
     'donations',  jsonb_build_object('view', false, 'create', false, 'update', false, 'delete', false),
     'media',      jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', false),
     'services',   jsonb_build_object('view', true,  'create', true,  'update', true,  'delete', false),
     'users',      jsonb_build_object('view', false, 'create', false, 'update', false, 'delete', false),
     'settings',   jsonb_build_object('view', false, 'create', false, 'update', false, 'delete', false)
  ))
on conflict (role) do nothing;

-- 5. RPC: update role permissions (super_admin only) -------------------------
create or replace function public.set_role_permissions(
  target_role text,
  new_permissions jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can change role permissions' using errcode = '42501';
  end if;

  if target_role not in ('admin', 'editor') then
    raise exception 'Only admin and editor roles are configurable (got %)', target_role
      using errcode = '22023';
  end if;

  insert into public.role_permissions (role, permissions, updated_at, updated_by)
  values (target_role, new_permissions, now(), auth.uid())
  on conflict (role) do update
    set permissions = excluded.permissions,
        updated_at  = excluded.updated_at,
        updated_by  = excluded.updated_by;
end;
$$;

grant execute on function public.set_role_permissions(text, jsonb) to authenticated;

-- 6. Update list_admin_users to include super_admins ------------------------
-- The previous version restricted callers to admin-only. Now we let
-- super_admin in too (admin already implicitly via current_user_role()
-- coalescing). The returned set also surfaces 'super_admin' rows.
create or replace function public.list_admin_users()
returns table(
  id         uuid,
  email      text,
  full_name  text,
  role       text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select ur.user_id, au.email, ur.full_name, ur.role, ur.created_at
  from   public.user_roles ur
  join   auth.users au on au.id = ur.user_id
  where  public.current_user_role() = 'admin'  -- admin OR super_admin (mapped)
  order  by case ur.role
              when 'super_admin' then 0
              when 'admin'       then 1
              when 'editor'      then 2
              else 3
            end,
            au.email;
$$;

grant execute on function public.list_admin_users() to authenticated;

-- 7. RPC: change a user's role (super_admin only, with safety rails) --------
create or replace function public.set_user_role(
  target_user_id uuid,
  new_role text
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  super_admin_count int;
  target_current_role text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super_admin can change user roles' using errcode = '42501';
  end if;

  if new_role not in ('super_admin', 'admin', 'editor') then
    raise exception 'Invalid role %', new_role using errcode = '22023';
  end if;

  select role into target_current_role
  from public.user_roles
  where user_id = target_user_id;

  if target_current_role is null then
    raise exception 'Target user has no role row' using errcode = '23503';
  end if;

  -- Prevent demoting the last super_admin so the system can't be locked out.
  if target_current_role = 'super_admin' and new_role <> 'super_admin' then
    select count(*) into super_admin_count
    from public.user_roles where role = 'super_admin';
    if super_admin_count <= 1 then
      raise exception 'Cannot demote the last super_admin' using errcode = '23514';
    end if;
  end if;

  update public.user_roles
     set role = new_role
   where user_id = target_user_id;
end;
$$;

grant execute on function public.set_user_role(uuid, text) to authenticated;
