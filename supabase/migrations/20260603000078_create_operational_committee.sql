-- =============================================================================
-- Migration: 20260603000078_create_operational_committee.sql
-- Purpose : Create operational_committee_members table for About page
-- =============================================================================

create table if not exists public.operational_committee_members (
  id          text primary key,
  name        text not null,
  origin      text,
  role        text,
  bio         text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  image_url   text
);

alter table public.operational_committee_members enable row level security;

drop policy if exists op_committee_public_read on public.operational_committee_members;
create policy op_committee_public_read on public.operational_committee_members
  for select using (active = true);

drop policy if exists op_committee_admin_all on public.operational_committee_members;
create policy op_committee_admin_all on public.operational_committee_members
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
