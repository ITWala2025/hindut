-- =============================================================================
-- Migration: 20261026000094_fix_tier_ticket_bookings_counts.sql
-- Purpose : Add num_children_0_4 column to public.ticket_bookings to separate
--           children aged 0-4 (free tier) from children aged 5-11 (paid tier).
--           Update insert_ticket_booking_encrypted RPC to accept p_num_children_0_4.
--           Correct historical booking data for HAI-TKT-C2DDA3-GHZ2 and 4MXS.
-- =============================================================================

-- 1. Add num_children_0_4 column if it does not already exist
alter table public.ticket_bookings
  add column if not exists num_children_0_4 integer not null default 0 check (num_children_0_4 >= 0);

-- Drop old 14-parameter version if it exists to avoid overload ambiguity
drop function if exists public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text);

create or replace function public.insert_ticket_booking_encrypted(
  p_event_id          uuid,
  p_reference         text,
  p_first_name        text,
  p_last_name         text,
  p_phone             text,
  p_email             text,
  p_phone_masked      text,
  p_email_masked      text,
  p_num_adults        integer,
  p_num_children      integer,
  p_amount_eur        numeric,
  p_payment_gateway   text,
  p_consent_gdpr      boolean,
  p_enc_key           text,
  p_num_children_0_4  integer default 0
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
    num_adults, num_children, num_children_0_4,
    amount_eur, payment_gateway,
    consent_gdpr, status
  ) values (
    p_event_id, p_reference,
    p_first_name, p_last_name,
    pgp_sym_encrypt(p_phone, p_enc_key),
    pgp_sym_encrypt(p_email, p_enc_key),
    p_phone_masked, p_email_masked,
    p_num_adults, p_num_children, coalesce(p_num_children_0_4, 0),
    p_amount_eur, p_payment_gateway,
    p_consent_gdpr, 'confirmed'
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer) from public, anon, authenticated;
grant execute on function public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer) to service_role;

-- 3. Fix historical Diwali 2026 bookings where 3 adults + 1 child (5-11) were purchased (€49)
update public.ticket_bookings
set
  num_adults = 3,
  num_children = 1,
  num_children_0_4 = 0,
  updated_at = now()
where reference_number in ('HAI-TKT-C2DDA3-GHZ2', 'HAI-TKT-C2DDA3-4MXS');
