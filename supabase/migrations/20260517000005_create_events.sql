-- =============================================================================
-- Migration: 20260517000005_create_events.sql
-- Purpose : Event metadata for the public Events page and ticketed events.
-- =============================================================================

create table if not exists public.events (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  slug                text unique,
  description         text,
  start_date          timestamptz not null,
  end_date            timestamptz,
  location            text,
  image_url           text,
  is_paid             boolean not null default false,
  stripe_product_id   text,
  ticket_price_eur    numeric(12, 2),
  ticket_capacity     int,
  published           boolean not null default true,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists events_start_date_idx on public.events (start_date);
create index if not exists events_published_idx  on public.events (published);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.events enable row level security;

-- Public can read published events.
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select
  using (published = true);

-- Admins: full access.
drop policy if exists events_admin_all on public.events;
create policy events_admin_all on public.events
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Editors: can select all + update/insert free events only.
drop policy if exists events_editor_read on public.events;
create policy events_editor_read on public.events
  for select
  using (public.current_user_role() in ('admin', 'editor'));

drop policy if exists events_editor_insert on public.events;
create policy events_editor_insert on public.events
  for insert
  with check (
    public.current_user_role() = 'editor'
    and is_paid = false
  );

drop policy if exists events_editor_update on public.events;
create policy events_editor_update on public.events
  for update
  using (public.current_user_role() = 'editor' and is_paid = false)
  with check (public.current_user_role() = 'editor' and is_paid = false);
