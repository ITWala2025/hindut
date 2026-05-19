-- =============================================================================
-- Migration: 20260519000035_create_ticket_bookings.sql
-- Purpose : Ticket booking records for paid events.
--           Mirrors event_rsvps design: phone + email encrypted at rest,
--           masked copies for admin display without decryption.
-- =============================================================================

-- Table -----------------------------------------------------------------------
create table if not exists public.ticket_bookings (
  id                   uuid        primary key default uuid_generate_v4(),
  event_id             uuid        not null references public.events(id) on delete cascade,
  reference_number     text        unique not null,
  first_name           text        not null check (length(trim(first_name))  > 0),
  last_name            text        not null check (length(trim(last_name))   > 0),
  -- Encrypted with pgp_sym_encrypt; key = RSVP_ENCRYPTION_KEY env var.
  phone_encrypted      bytea       not null,
  email_encrypted      bytea       not null,
  -- Masked copies for admin display (no decryption required).
  phone_masked         text        not null,
  email_masked         text        not null,
  num_adults           integer     not null check (num_adults   >= 1),
  num_children         integer     not null default 0 check (num_children >= 0),
  amount_eur           numeric(10, 2) not null check (amount_eur >= 0),
  payment_gateway      text        check (payment_gateway in ('stripe')),
  payment_reference    text,        -- transaction / intent ID from gateway
  consent_gdpr         boolean     not null check (consent_gdpr = true),
  status               text        not null default 'confirmed'
                                   check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  confirmation_sent_at timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists ticket_bookings_event_id_idx   on public.ticket_bookings (event_id);
create index if not exists ticket_bookings_created_at_idx on public.ticket_bookings (created_at desc);
create index if not exists ticket_bookings_reference_idx  on public.ticket_bookings (reference_number);
create index if not exists ticket_bookings_status_idx     on public.ticket_bookings (status);

drop trigger if exists ticket_bookings_set_updated_at on public.ticket_bookings;
create trigger ticket_bookings_set_updated_at
  before update on public.ticket_bookings
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.ticket_bookings enable row level security;

-- Admin & editor: read-only.
drop policy if exists ticket_bookings_staff_select on public.ticket_bookings;
create policy ticket_bookings_staff_select on public.ticket_bookings
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Admin only: update status (cancel, refund).
drop policy if exists ticket_bookings_admin_update on public.ticket_bookings;
create policy ticket_bookings_admin_update on public.ticket_bookings
  for update
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Service role: belt-and-suspenders INSERT + UPDATE policies
-- (service_role already has bypassrls, but explicit policies prevent any
-- edge case where SECURITY DEFINER owner bypass is unavailable).
drop policy if exists ticket_bookings_service_insert on public.ticket_bookings;
create policy ticket_bookings_service_insert on public.ticket_bookings
  for insert
  to service_role
  with check (true);

drop policy if exists ticket_bookings_service_update on public.ticket_bookings;
create policy ticket_bookings_service_update on public.ticket_bookings
  for update
  to service_role
  using  (true)
  with check (true);

-- Table-level grants ----------------------------------------------------------
grant select, insert, update on public.ticket_bookings to service_role;
grant select, update          on public.ticket_bookings to authenticated;

-- =============================================================================
-- Function: insert_ticket_booking_encrypted
-- Called exclusively by the ticket-submit Netlify Function via service_role.
-- =============================================================================
create or replace function public.insert_ticket_booking_encrypted(
  p_event_id         uuid,
  p_reference        text,
  p_first_name       text,
  p_last_name        text,
  p_phone            text,
  p_email            text,
  p_phone_masked     text,
  p_email_masked     text,
  p_num_adults       integer,
  p_num_children     integer,
  p_amount_eur       numeric,
  p_payment_gateway  text,
  p_consent_gdpr     boolean,
  p_enc_key          text
) returns uuid
language plpgsql
security definer
set search_path = extensions, public
as $$
declare
  v_id uuid;
begin
  if p_enc_key is null or length(p_enc_key) < 16 then
    raise exception 'Encryption key is missing or too short';
  end if;

  insert into public.ticket_bookings (
    event_id, reference_number,
    first_name, last_name,
    phone_encrypted, email_encrypted,
    phone_masked, email_masked,
    num_adults, num_children,
    amount_eur, payment_gateway,
    consent_gdpr, status
  ) values (
    p_event_id, p_reference,
    p_first_name, p_last_name,
    pgp_sym_encrypt(p_phone, p_enc_key),
    pgp_sym_encrypt(p_email, p_enc_key),
    p_phone_masked, p_email_masked,
    p_num_adults, p_num_children,
    p_amount_eur, p_payment_gateway,
    p_consent_gdpr, 'confirmed'
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Only service_role may call this function.
revoke all on function public.insert_ticket_booking_encrypted from public, anon, authenticated;
grant execute on function public.insert_ticket_booking_encrypted to service_role;

-- Pin owner to postgres so SECURITY DEFINER always bypasses RLS.
alter function public.insert_ticket_booking_encrypted(
  uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text
) owner to postgres;
