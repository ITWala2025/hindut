-- =============================================================================
-- Migration: 20261026000096_unmask_ticket_bookings_contact.sql
-- Purpose  : 1. Add unmasked email and phone columns to public.ticket_bookings
--               so authenticated admin users can view attendee contact details.
--            2. Create decrypt_and_unmask_ticket_bookings(p_enc_key) RPC to
--               decrypt existing phone_encrypted and email_encrypted records.
--            3. Update auto_create_receipt_for_ticket to use unmasked email.
--            4. Update insert_ticket_booking_encrypted to store unmasked contact
--               information alongside encrypted and masked copies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add email and phone columns
-- ---------------------------------------------------------------------------
alter table public.ticket_bookings
  add column if not exists email text,
  add column if not exists phone text;

-- ---------------------------------------------------------------------------
-- 2. Create RPC function to decrypt and unmask existing ticket bookings
-- ---------------------------------------------------------------------------
create or replace function public.decrypt_and_unmask_ticket_bookings(p_enc_key text)
returns integer
language plpgsql
security definer
set search_path = extensions, public
as $$
declare
  v_count integer := 0;
begin
  if p_enc_key is null or length(p_enc_key) < 16 then
    raise exception 'Invalid encryption key';
  end if;

  update public.ticket_bookings
  set
    email = case
      when (email is null or email = '' or email like '%***%') and email_encrypted is not null
      then pgp_sym_decrypt(email_encrypted, p_enc_key)::text
      else email
    end,
    phone = case
      when (phone is null or phone = '' or phone like '%***%') and phone_encrypted is not null
      then pgp_sym_decrypt(phone_encrypted, p_enc_key)::text
      else phone
    end
  where (email is null or email = '' or email like '%***%' or phone is null or phone = '' or phone like '%***%');

  get diagnostics v_count = row_count;

  -- Also update receipts table with unmasked email where available
  update public.receipts r
  set recipient_email = tb.email
  from public.ticket_bookings tb
  where r.type = 'event'
    and r.related_id = tb.id
    and tb.email is not null
    and tb.email not like '%***%';

  return v_count;
end;
$$;

revoke all on function public.decrypt_and_unmask_ticket_bookings(text) from public, anon, authenticated;
grant execute on function public.decrypt_and_unmask_ticket_bookings(text) to service_role;
alter function public.decrypt_and_unmask_ticket_bookings(text) owner to postgres;

-- ---------------------------------------------------------------------------
-- 3. Update auto_create_receipt_for_ticket to save unmasked email
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_receipt_for_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' then
    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual,
      email_status, sent_at
    ) values (
      new.id, 'event',
      trim(new.first_name || ' ' || new.last_name),
      coalesce(nullif(new.email, ''), new.email_masked),
      new.amount_eur,
      'Ticket booking ' || new.reference_number,
      coalesce(new.payment_reference, new.payment_gateway),
      'tmpl-event',
      false,
      'sent',
      now()
    )
    on conflict (type, related_id) where related_id is not null do update
      set payment_reference = coalesce(excluded.payment_reference, public.receipts.payment_reference),
          recipient_email   = coalesce(nullif(excluded.recipient_email, ''), public.receipts.recipient_email),
          email_status      = case when public.receipts.email_status = 'pending' then 'sent' else public.receipts.email_status end,
          sent_at           = coalesce(public.receipts.sent_at, now()),
          updated_at        = now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Update insert_ticket_booking_encrypted to persist unmasked email & phone
-- ---------------------------------------------------------------------------
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
  p_num_children_0_4  integer default 0,
  p_payment_reference text default null
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
    phone, email,
    num_adults, num_children, num_children_0_4,
    amount_eur, payment_gateway, payment_reference,
    consent_gdpr, status
  ) values (
    p_event_id, p_reference,
    p_first_name, p_last_name,
    case when p_phone is not null and length(trim(p_phone)) > 0 then pgp_sym_encrypt(trim(p_phone), p_enc_key) else pgp_sym_encrypt('', p_enc_key) end,
    pgp_sym_encrypt(p_email, p_enc_key),
    coalesce(p_phone_masked, ''), p_email_masked,
    coalesce(p_phone, ''), p_email,
    p_num_adults, p_num_children, coalesce(p_num_children_0_4, 0),
    p_amount_eur, p_payment_gateway, p_payment_reference,
    p_consent_gdpr, 'confirmed'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer, text) from public, anon, authenticated;
grant execute on function public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer, text) to service_role;
alter function public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer, text) owner to postgres;
