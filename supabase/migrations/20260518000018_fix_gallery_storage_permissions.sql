-- =============================================================================
-- Migration: 20260518000018_fix_gallery_storage_permissions.sql
-- Purpose : Fix permission issues when uploading to the public-gallery bucket.
--           Safe to re-run (fully idempotent).
--
-- Root causes addressed:
--   1. current_user_role() may not exist or may throw if user_roles row is absent.
--   2. Storage write/update policies missing `to authenticated` target role.
--   3. UPDATE policy was missing `with check` clause.
--   4. Bucket may not yet exist in the database (migration never applied).
-- =============================================================================

-- ─── 1. Ensure bucket exists ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('public-gallery', 'public-gallery', true)
on conflict (id) do update
  set public = true;

-- ─── 2. Ensure current_user_role() is present and correct ────────────────────
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

grant execute on function public.current_user_role() to anon, authenticated;

-- ─── 3. Recreate storage.objects policies for public-gallery ─────────────────

-- READ: anyone (including unauthenticated visitors) may view images.
drop policy if exists "public-gallery read" on storage.objects;
create policy "public-gallery read" on storage.objects
  for select
  using (bucket_id = 'public-gallery');

-- INSERT: only authenticated admins / editors may upload.
drop policy if exists "public-gallery write" on storage.objects;
create policy "public-gallery write" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  );

-- UPDATE: only authenticated admins / editors may replace files.
--         Both `using` (existing row check) and `with check` (new row check)
--         are required for UPDATE policies.
drop policy if exists "public-gallery update" on storage.objects;
create policy "public-gallery update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  )
  with check (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  );

-- DELETE: only admins may remove files.
drop policy if exists "public-gallery delete" on storage.objects;
create policy "public-gallery delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'public-gallery'
    and public.current_user_role() = 'admin'
  );

-- ─── 4. Table-level GRANTs for service_role ─────────────────────────────────
-- service_role bypasses RLS but still needs table-level privileges on tables
-- that were not created with default grants. The upload script uses service_role.
grant select, insert, update, delete on public.media to service_role;

-- Also grant on other tables used by server-side operations
grant select, insert, update, delete on public.members          to service_role;
grant select, insert, update, delete on public.memberships      to service_role;
grant select, insert, update, delete on public.events           to service_role;
grant select, insert, update, delete on public.donations        to service_role;
grant select, insert, update, delete on public.tickets          to service_role;
grant select, insert, update, delete on public.receipts         to service_role;
grant select, insert, update, delete on public.user_roles       to service_role;
grant select, insert, update, delete on public.team_members     to service_role;
grant select, insert, update, delete on public.membership_plans to service_role;

-- ─── 5. Ensure the admin user has the correct role ───────────────────────────
-- If the admin row is missing, uploads will fail even with valid auth.
-- Re-running this block is safe; it only updates if the user already exists.
do $$
declare
  v_user_id uuid;
  v_email   text := 'admin@hindutemple.com';
begin
  select id into v_user_id
  from auth.users
  where email = v_email;

  if v_user_id is null then
    raise notice
      'User "%" not found in auth.users — skipping user_roles upsert.',
      v_email;
    return;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'admin')
  on conflict (user_id) do update
    set role = 'admin';

  raise notice 'Admin role confirmed for % (user_id: %)', v_email, v_user_id;
end;
$$;
