-- =============================================================================
-- Migration: 20260518000026_create_service_categories.sql
-- Purpose : Create service_categories lookup table and seed the four default
--           categories. All statements use IF NOT EXISTS / ON CONFLICT so this
--           is a safe no-op if migration 20260518000024 already ran.
-- =============================================================================
-- NOTE: As of migration 20260518000024, service_categories is created there.
--       This migration is kept for compatibility with databases that applied
--       migration 24 before it was updated.

create table if not exists public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.service_categories enable row level security;

drop policy if exists svc_cat_public_read on public.service_categories;
create policy svc_cat_public_read on public.service_categories
  for select using (true);

drop policy if exists svc_cat_admin_all on public.service_categories;
create policy svc_cat_admin_all on public.service_categories
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Grants
grant select on public.service_categories to anon;
grant select, insert, update, delete on public.service_categories to authenticated;
grant select, insert, update, delete on public.service_categories to service_role;

-- Seed the four default categories
insert into public.service_categories (name, sort_order) values
  ('Daily Pujas',        1),
  ('Special Ceremonies', 2),
  ('Education Programs', 3),
  ('Community Programs', 4)
on conflict (name) do nothing;
