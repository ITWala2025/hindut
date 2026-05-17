-- =============================================================================
-- Migration: 20260517000009_create_seo_meta.sql
-- Purpose : Per-page SEO overrides editable from the Admin Portal.
-- =============================================================================

create table if not exists public.seo_meta (
  id              uuid primary key default uuid_generate_v4(),
  page_path       text not null unique,
  title           text,
  description     text,
  og_image        text,
  canonical_url   text,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists seo_meta_set_updated_at on public.seo_meta;
create trigger seo_meta_set_updated_at
  before update on public.seo_meta
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.seo_meta enable row level security;

-- SEO metadata is public-readable (it ends up in HTML head anyway).
drop policy if exists seo_meta_public_read on public.seo_meta;
create policy seo_meta_public_read on public.seo_meta
  for select
  using (true);

drop policy if exists seo_meta_admin_all on public.seo_meta;
create policy seo_meta_admin_all on public.seo_meta
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists seo_meta_editor_update on public.seo_meta;
create policy seo_meta_editor_update on public.seo_meta
  for update
  using (public.current_user_role() = 'editor')
  with check (public.current_user_role() = 'editor');
