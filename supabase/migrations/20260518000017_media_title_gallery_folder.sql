-- =============================================================================
-- Migration: 20260518000017_media_title_gallery_folder.sql
-- Purpose : (1) Add `title` column to public.media
--           (2) Extend `folder` check constraint to include 'gallery'
--           (3) Add bucket policy for 'public-gallery' UPDATE (needed by CRUD)
-- Idempotent — safe to re-run.
-- =============================================================================

-- 1. Add title column
alter table public.media
  add column if not exists title text;

-- 2. Extend folder constraint to include 'gallery'
--    Find the existing check constraint on media.folder and drop it, then recreate.
do $$
declare
  c text;
begin
  select tc.constraint_name into c
  from information_schema.table_constraints tc
  join information_schema.check_constraints cc
    on cc.constraint_name = tc.constraint_name
   and cc.constraint_schema = tc.constraint_schema
  where tc.table_schema = 'public'
    and tc.table_name   = 'media'
    and cc.check_clause ilike '%folder%'
  limit 1;

  if c is not null then
    execute format('alter table public.media drop constraint %I', c);
  end if;
end $$;

alter table public.media
  add constraint media_folder_check
  check (folder is null or folder in ('events', 'temple', 'community', 'general', 'gallery'));

-- 3. Ensure the 'media' bucket also exists (used by older hook code)
--    Point all uploads at 'public-gallery' which is already created.
--    This is just a safety entry so any stray 'media' bucket references don't fail.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- 4. Storage policy: allow admin/editor to UPDATE objects in public-gallery
--    (needed for alt-text / title edits that also replace files)
drop policy if exists "public-gallery owner-update" on storage.objects;
create policy "public-gallery owner-update" on storage.objects
  for update
  using (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  )
  with check (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  );

-- 5. Backfill title for any existing media rows that have no title
update public.media
set title = coalesce(filename, path)
where title is null;
