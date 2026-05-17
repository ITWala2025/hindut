-- =============================================================================
-- Migration: 20260517000006_create_tickets.sql
-- Purpose : Ticket purchases for paid events.
-- =============================================================================

create table if not exists public.tickets (
  id                          uuid primary key default uuid_generate_v4(),
  event_id                    uuid not null references public.events(id) on delete cascade,
  user_id                     uuid references auth.users(id) on delete set null,
  attendee_name               text not null,
  attendee_email              text not null,
  stripe_price_id             text,
  stripe_payment_intent_id    text,
  quantity                    int not null default 1 check (quantity > 0),
  amount_eur                  numeric(12, 2),
  status                      text not null default 'pending'
                                check (status in ('pending', 'confirmed', 'canceled', 'refunded')),
  purchased_at                timestamptz not null default now()
);

create index if not exists tickets_event_id_idx on public.tickets (event_id);
create index if not exists tickets_user_id_idx  on public.tickets (user_id);
create index if not exists tickets_status_idx   on public.tickets (status);

-- Row-Level Security ----------------------------------------------------------
alter table public.tickets enable row level security;

drop policy if exists tickets_admin_all on public.tickets;
create policy tickets_admin_all on public.tickets
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists tickets_editor_read on public.tickets;
create policy tickets_editor_read on public.tickets
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Users can read their own tickets.
drop policy if exists tickets_self_read on public.tickets;
create policy tickets_self_read on public.tickets
  for select
  using (user_id = auth.uid());
