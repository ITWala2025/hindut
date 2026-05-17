-- =============================================================================
-- Migration: 20260517000004_create_donations.sql
-- Purpose : One-time and recurring donations linked to Stripe PaymentIntents.
-- =============================================================================

create table if not exists public.donations (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid references auth.users(id) on delete set null,
  donor_name                  text,
  donor_email                 text,
  stripe_payment_intent_id    text unique,
  paypal_order_id             text unique,
  sumup_checkout_id           text unique,
  gateway                     text not null check (gateway in ('stripe', 'paypal', 'sumup', 'manual')),
  amount_eur                  numeric(12, 2) not null check (amount_eur > 0),
  currency                    text not null default 'EUR',
  recurring                   boolean not null default false,
  status                      text not null default 'pending'
                                check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  description                 text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists donations_user_id_idx     on public.donations (user_id);
create index if not exists donations_created_at_idx  on public.donations (created_at desc);
create index if not exists donations_status_idx      on public.donations (status);

drop trigger if exists donations_set_updated_at on public.donations;
create trigger donations_set_updated_at
  before update on public.donations
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.donations enable row level security;

drop policy if exists donations_admin_all on public.donations;
create policy donations_admin_all on public.donations
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists donations_editor_read on public.donations;
create policy donations_editor_read on public.donations
  for select
  using (public.current_user_role() in ('admin', 'editor'));

drop policy if exists donations_self_read on public.donations;
create policy donations_self_read on public.donations
  for select
  using (user_id = auth.uid());
