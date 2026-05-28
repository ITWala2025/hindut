-- =============================================================================
-- Migration: 20260528000071_special_causes.sql
-- Purpose : Special Cause donation campaigns with per-cause progress tracking.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- special_causes table
-- ---------------------------------------------------------------------------
create table if not exists public.special_causes (
  id                  uuid         primary key default uuid_generate_v4(),
  slug                text         not null unique,
  title               text         not null,
  description         text,
  cover_image_url     text,
  target_amount_eur   numeric(12,2),
  deadline            timestamptz,
  status              text         not null default 'draft'
                                   check (status in ('draft', 'active', 'paused', 'closed')),
  created_by          uuid         references auth.users(id) on delete set null,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

create index if not exists special_causes_status_idx on public.special_causes (status);
create index if not exists special_causes_slug_idx   on public.special_causes (slug);

drop trigger if exists special_causes_set_updated_at on public.special_causes;
create trigger special_causes_set_updated_at
  before update on public.special_causes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Add cause_id FK to donations (nullable — existing rows unaffected)
-- ---------------------------------------------------------------------------
alter table public.donations
  add column if not exists cause_id uuid references public.special_causes(id) on delete set null;

create index if not exists donations_cause_id_idx on public.donations (cause_id);

-- ---------------------------------------------------------------------------
-- RLS for special_causes
-- ---------------------------------------------------------------------------
alter table public.special_causes enable row level security;

-- Public anon can read non-draft causes
drop policy if exists causes_public_read on public.special_causes;
create policy causes_public_read on public.special_causes
  for select
  using (status in ('active', 'paused', 'closed'));

-- Admins and editors can read all (including drafts)
drop policy if exists causes_staff_read on public.special_causes;
create policy causes_staff_read on public.special_causes
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Admins can insert/update/delete
drop policy if exists causes_admin_write on public.special_causes;
create policy causes_admin_write on public.special_causes
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- RPC: total raised for one cause — callable by anon (returns aggregate only)
-- ---------------------------------------------------------------------------
create or replace function public.get_cause_total_raised(p_cause_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount_eur), 0)
  from donations
  where cause_id = p_cause_id and status = 'succeeded';
$$;

grant execute on function public.get_cause_total_raised(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: all causes with aggregated raised + donor count (authenticated only)
-- ---------------------------------------------------------------------------
create or replace function public.get_causes_with_stats()
returns table (
  id                uuid,
  slug              text,
  title             text,
  description       text,
  cover_image_url   text,
  target_amount_eur numeric,
  deadline          timestamptz,
  status            text,
  created_by        uuid,
  created_at        timestamptz,
  updated_at        timestamptz,
  total_raised      numeric,
  donor_count       bigint
)
language sql
security definer
set search_path = public
as $$
  select
    sc.id,
    sc.slug,
    sc.title,
    sc.description,
    sc.cover_image_url,
    sc.target_amount_eur,
    sc.deadline,
    sc.status,
    sc.created_by,
    sc.created_at,
    sc.updated_at,
    coalesce(sum(d.amount_eur) filter (where d.status = 'succeeded'), 0) as total_raised,
    count(distinct d.id) filter (where d.status = 'succeeded')          as donor_count
  from public.special_causes sc
  left join public.donations d on d.cause_id = sc.id
  group by sc.id
  order by sc.created_at desc;
$$;

grant execute on function public.get_causes_with_stats() to authenticated;
