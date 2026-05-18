-- =============================================================================
-- Migration: 20260518000024_create_services.sql
-- Purpose : Create service_categories lookup table and the services table
--           (with category_id FK). Also seeds the four default categories.
--           Migrations 26 and 27 are safe no-ops when this runs first.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. Create service_categories first (services FK depends on it)
create table if not exists public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- RLS for service_categories
alter table public.service_categories enable row level security;

drop policy if exists svc_cat_public_read on public.service_categories;
create policy svc_cat_public_read on public.service_categories
  for select using (true);

drop policy if exists svc_cat_admin_all on public.service_categories;
create policy svc_cat_admin_all on public.service_categories
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

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

-- 2. Create services table with category_id FK
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  category_id uuid references public.service_categories(id),
  excerpt     text,
  content     text,
  image_url   text,
  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists services_category_id_idx on public.services (category_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- RLS
alter table public.services enable row level security;

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select using (published = true);

drop policy if exists services_admin_all on public.services;
create policy services_admin_all on public.services
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Grants
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.services to service_role;
