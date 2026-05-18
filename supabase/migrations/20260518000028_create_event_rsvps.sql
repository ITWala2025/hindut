-- =============================================================================
-- Migration: 20260518000028_create_event_rsvps.sql
-- Purpose : RSVP records for free public events.
--           Phone and email are encrypted at rest using pgcrypto.
--           Masked variants allow admin display without decryption.
-- =============================================================================

-- Table -----------------------------------------------------------------------
create table if not exists public.event_rsvps (
  id                   uuid        primary key default uuid_generate_v4(),
  event_id             uuid        not null references public.events(id) on delete cascade,
  reference_number     text        unique not null,
  first_name           text        not null check (length(trim(first_name))  > 0),
  last_name            text        not null check (length(trim(last_name))   > 0),
  -- Encrypted with pgp_sym_encrypt; key managed via RSVP_ENCRYPTION_KEY env var.
  phone_encrypted      bytea       not null,
  email_encrypted      bytea       not null,
  -- Masked copies for admin display (no decryption required).
  phone_masked         text        not null,
  email_masked         text        not null,
  num_adults           integer     not null check (num_adults   >= 1),
  num_children         integer     not null default 0 check (num_children >= 0),
  consent_gdpr         boolean     not null check (consent_gdpr = true),
  status               text        not null default 'confirmed'
                                   check (status in ('confirmed', 'cancelled')),
  confirmation_sent_at timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists event_rsvps_event_id_idx   on public.event_rsvps (event_id);
create index if not exists event_rsvps_created_at_idx on public.event_rsvps (created_at desc);
create index if not exists event_rsvps_reference_idx  on public.event_rsvps (reference_number);
create index if not exists event_rsvps_status_idx     on public.event_rsvps (status);

drop trigger if exists event_rsvps_set_updated_at on public.event_rsvps;
create trigger event_rsvps_set_updated_at
  before update on public.event_rsvps
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.event_rsvps enable row level security;

-- Public / anon: no direct access (all PII is protected).
-- Authenticated admin & editor: read-only via masked columns.
drop policy if exists event_rsvps_staff_select on public.event_rsvps;
create policy event_rsvps_staff_select on public.event_rsvps
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Admin only: cancel / update status.
drop policy if exists event_rsvps_admin_update on public.event_rsvps;
create policy event_rsvps_admin_update on public.event_rsvps
  for update
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Service role (edge functions): full access granted below.
grant select, insert, update on public.event_rsvps to service_role;

-- =============================================================================
-- Function: insert_rsvp_encrypted
-- Called exclusively by the rsvp-submit Edge Function via service_role.
-- Encrypts phone + email with pgcrypto before inserting.
-- =============================================================================
create or replace function public.insert_rsvp_encrypted(
  p_event_id     uuid,
  p_reference    text,
  p_first_name   text,
  p_last_name    text,
  p_phone        text,
  p_email        text,
  p_phone_masked text,
  p_email_masked text,
  p_num_adults   integer,
  p_num_children integer,
  p_consent_gdpr boolean,
  p_enc_key      text
) returns uuid
language plpgsql
security definer
set search_path = extensions, public
as $$
declare
  v_id uuid;
begin
  if p_enc_key is null or length(p_enc_key) < 16 then
    raise exception 'RSVP encryption key is missing or too short';
  end if;

  insert into public.event_rsvps (
    event_id, reference_number,
    first_name, last_name,
    phone_encrypted, email_encrypted,
    phone_masked, email_masked,
    num_adults, num_children,
    consent_gdpr, status
  ) values (
    p_event_id, p_reference,
    p_first_name, p_last_name,
    pgp_sym_encrypt(p_phone, p_enc_key),
    pgp_sym_encrypt(p_email, p_enc_key),
    p_phone_masked, p_email_masked,
    p_num_adults, p_num_children,
    p_consent_gdpr, 'confirmed'
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Only the service_role (edge functions) may call this.
revoke all on function public.insert_rsvp_encrypted from public, anon, authenticated;
grant execute on function public.insert_rsvp_encrypted to service_role;

-- =============================================================================
-- Function: export_rsvps_decrypted
-- Called by the rsvp-export Edge Function (service_role) to produce CSV data.
-- Decrypts phone and email; requires the encryption key to be passed.
-- =============================================================================
create or replace function public.export_rsvps_decrypted(
  p_enc_key   text,
  p_event_id  uuid    default null,
  p_from_date date    default null,
  p_to_date   date    default null,
  p_status    text    default null
) returns table (
  id                   uuid,
  event_title          text,
  reference_number     text,
  first_name           text,
  last_name            text,
  phone                text,
  email                text,
  num_adults           integer,
  num_children         integer,
  status               text,
  confirmation_sent_at timestamptz,
  created_at           timestamptz
)
language plpgsql
security definer
set search_path = extensions, public
as $$
begin
  if p_enc_key is null or length(p_enc_key) < 16 then
    raise exception 'Invalid encryption key';
  end if;

  return query
    select
      r.id,
      e.title                                              as event_title,
      r.reference_number,
      r.first_name,
      r.last_name,
      pgp_sym_decrypt(r.phone_encrypted, p_enc_key)::text as phone,
      pgp_sym_decrypt(r.email_encrypted, p_enc_key)::text as email,
      r.num_adults,
      r.num_children,
      r.status,
      r.confirmation_sent_at,
      r.created_at
    from public.event_rsvps r
    join public.events       e on e.id = r.event_id
    where
      (p_event_id  is null or r.event_id       = p_event_id)
      and (p_from_date is null or r.created_at::date >= p_from_date)
      and (p_to_date   is null or r.created_at::date <= p_to_date)
      and (p_status    is null or r.status          = p_status)
    order by r.created_at desc;
end;
$$;

-- Only the service_role (edge functions) may call this.
revoke all on function public.export_rsvps_decrypted from public, anon, authenticated;
grant execute on function public.export_rsvps_decrypted to service_role;
