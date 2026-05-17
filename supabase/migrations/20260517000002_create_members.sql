-- =============================================================================
-- Migration: 20260517000002_create_members.sql
-- Purpose : Member profile records linked to auth.users.
-- =============================================================================

create table if not exists public.members (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  full_name   text not null,
  address     text,
  phone       text,
  joined_at   timestamptz not null default now()
);

create index if not exists members_user_id_idx on public.members (user_id);

-- Row-Level Security ----------------------------------------------------------
alter table public.members enable row level security;

-- Admins: full access.
drop policy if exists members_admin_all on public.members;
create policy members_admin_all on public.members
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Editors: read-only.
drop policy if exists members_editor_read on public.members;
create policy members_editor_read on public.members
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Members: can read their own profile.
drop policy if exists members_self_read on public.members;
create policy members_self_read on public.members
  for select
  using (user_id = auth.uid());
