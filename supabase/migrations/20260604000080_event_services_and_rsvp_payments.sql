-- =============================================================================
-- Migration: 20260604000080_event_services_and_rsvp_payments.sql
-- Purpose : Optional paid services on free events + service payment tracking.
-- =============================================================================

-- 1. Add event_services JSONB column to events (mirrors ticket_tiers pattern).
--    Each element: { id, serviceId, name, amountEur }
alter table public.events
  add column if not exists event_services jsonb not null default '[]'::jsonb;

-- 2. Service payments table — one row per selected service per RSVP.
create table if not exists public.event_rsvp_service_payments (
  id                uuid          primary key default uuid_generate_v4(),
  rsvp_id           uuid          not null references public.event_rsvps(id) on delete cascade,
  event_id          uuid          not null references public.events(id) on delete cascade,
  service_id        uuid,                           -- soft-ref, nullable (service may be deleted)
  service_name      text          not null,
  amount_eur        numeric(12,2) not null check (amount_eur >= 0),
  status            text          not null default 'pending'
                                  check (status in ('pending', 'paid', 'failed')),
  stripe_session_id text,
  paid_at           timestamptz,
  created_at        timestamptz   not null default now()
);

create index if not exists ersp_rsvp_id_idx    on public.event_rsvp_service_payments (rsvp_id);
create index if not exists ersp_event_id_idx   on public.event_rsvp_service_payments (event_id);
create index if not exists ersp_session_idx    on public.event_rsvp_service_payments (stripe_session_id)
  where stripe_session_id is not null;
create index if not exists ersp_status_idx     on public.event_rsvp_service_payments (status);

-- Row-Level Security
alter table public.event_rsvp_service_payments enable row level security;

-- Admin + editor can read
drop policy if exists ersp_staff_select on public.event_rsvp_service_payments;
create policy ersp_staff_select on public.event_rsvp_service_payments
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Admin full access
drop policy if exists ersp_admin_all on public.event_rsvp_service_payments;
create policy ersp_admin_all on public.event_rsvp_service_payments
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Service role (Netlify functions) full access
grant select, insert, update on public.event_rsvp_service_payments to service_role;
