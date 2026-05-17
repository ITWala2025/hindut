-- =============================================================================
-- Migration: 20260517000003_create_memberships.sql
-- Purpose : Membership records linked to Stripe customers / subscriptions.
-- =============================================================================

create table if not exists public.memberships (
  id                       uuid primary key default uuid_generate_v4(),
  member_id                uuid not null references public.members(id) on delete cascade,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  plan                     text not null check (plan in ('annual', 'semi_annual', 'monthly')),
  status                   text not null default 'pending'
                             check (status in ('pending', 'active', 'canceled', 'past_due', 'expired')),
  started_at               timestamptz,
  expires_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists memberships_member_plan_idx
  on public.memberships (member_id, plan);

create index if not exists memberships_stripe_subscription_idx
  on public.memberships (stripe_subscription_id);

create index if not exists memberships_status_idx
  on public.memberships (status);

-- updated_at trigger ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.memberships enable row level security;

drop policy if exists memberships_admin_all on public.memberships;
create policy memberships_admin_all on public.memberships
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Editors: can read memberships of members they are linked to.
drop policy if exists memberships_editor_read on public.memberships;
create policy memberships_editor_read on public.memberships
  for select
  using (
    public.current_user_role() = 'editor'
    and exists (
      select 1
        from public.members m
       where m.id = memberships.member_id
         and m.user_id = auth.uid()
    )
  );

-- Members: read their own memberships.
drop policy if exists memberships_self_read on public.memberships;
create policy memberships_self_read on public.memberships
  for select
  using (
    exists (
      select 1
        from public.members m
       where m.id = memberships.member_id
         and m.user_id = auth.uid()
    )
  );
