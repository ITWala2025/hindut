-- =============================================================================
-- Migration: 20260517000008_create_media.sql
-- Purpose : Metadata for media assets that live in Supabase Storage buckets.
-- =============================================================================

create table if not exists public.media (
  id           uuid primary key default uuid_generate_v4(),
  bucket       text not null,
  path         text not null,
  filename     text,
  folder       text check (folder in ('events', 'temple', 'community', 'general')),
  size_kb      int,
  alt_text     text,
  uploaded_by  uuid references auth.users(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);

create unique index if not exists media_bucket_path_idx on public.media (bucket, path);
create index        if not exists media_folder_idx      on public.media (folder);

-- Row-Level Security ----------------------------------------------------------
alter table public.media enable row level security;

drop policy if exists media_public_read on public.media;
create policy media_public_read on public.media
  for select
  using (bucket = 'public-gallery');

drop policy if exists media_admin_all on public.media;
create policy media_admin_all on public.media
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists media_editor_read on public.media;
create policy media_editor_read on public.media
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Editors may only upload metadata for the public-gallery bucket.
drop policy if exists media_editor_insert on public.media;
create policy media_editor_insert on public.media
  for insert
  with check (
    public.current_user_role() = 'editor'
    and bucket = 'public-gallery'
  );

drop policy if exists media_editor_update on public.media;
create policy media_editor_update on public.media
  for update
  using (public.current_user_role() = 'editor' and bucket = 'public-gallery')
  with check (public.current_user_role() = 'editor' and bucket = 'public-gallery');
