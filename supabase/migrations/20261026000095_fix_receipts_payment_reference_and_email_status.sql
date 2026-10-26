-- =============================================================================
-- Migration: 20261026000095_fix_receipts_payment_reference_and_email_status.sql
-- Purpose  : 1. Update insert_ticket_booking_encrypted to accept p_payment_reference.
--            2. Update auto_create_receipt_for_ticket() to sync payment_reference
--               and record email_status = 'sent'.
--            3. Update ticket_bookings_auto_receipt trigger to fire on
--               update of payment_reference as well.
--            4. Update auto_create_receipt_for_donation() and
--               auto_create_receipt_for_membership() to set email_status = 'sent'.
--            5. Backfill existing ticket receipts where payment_reference = 'stripe'
--               with their actual Stripe PaymentIntent IDs from ticket_bookings.
--            6. Backfill pending receipts email_status to 'sent' (or 'skipped' for offline).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop existing overloaded signatures of insert_ticket_booking_encrypted
-- ---------------------------------------------------------------------------
drop function if exists public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text);
drop function if exists public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer);
drop function if exists public.insert_ticket_booking_encrypted(uuid, text, text, text, text, text, text, text, integer, integer, numeric, text, boolean, text, integer, text);

-- ---------------------------------------------------------------------------
-- 2. Make phone columns optional in ticket_bookings
-- ---------------------------------------------------------------------------
alter table public.ticket_bookings alter column phone_encrypted drop not null;
alter table public.ticket_bookings alter column phone_masked drop not null;
alter table public.ticket_bookings alter column phone_masked set default '';

-- ---------------------------------------------------------------------------
-- 3. Create updated insert_ticket_booking_encrypted with p_payment_reference
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
    num_adults, num_children, num_children_0_4,
    amount_eur, payment_gateway, payment_reference,
    consent_gdpr, status
  ) values (
    p_event_id, p_reference,
    p_first_name, p_last_name,
    case when p_phone is not null and length(trim(p_phone)) > 0 then pgp_sym_encrypt(trim(p_phone), p_enc_key) else pgp_sym_encrypt('', p_enc_key) end,
    pgp_sym_encrypt(p_email, p_enc_key),
    coalesce(p_phone_masked, ''), p_email_masked,
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

-- ---------------------------------------------------------------------------
-- 3. Update auto_create_receipt_for_ticket() with UPSERT & email_status
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
      new.email_masked,
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
          email_status      = case when public.receipts.email_status = 'pending' then 'sent' else public.receipts.email_status end,
          sent_at           = coalesce(public.receipts.sent_at, now()),
          updated_at        = now();
  end if;
  return new;
end;
$$;

alter function public.auto_create_receipt_for_ticket() owner to postgres;

-- Recreate trigger to also listen on update of payment_reference
drop trigger if exists ticket_bookings_auto_receipt on public.ticket_bookings;
create trigger ticket_bookings_auto_receipt
  after insert or update of status, payment_reference on public.ticket_bookings
  for each row execute function public.auto_create_receipt_for_ticket();

-- ---------------------------------------------------------------------------
-- 4. Update auto_create_receipt_for_donation() with email_status = 'sent'
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_receipt_for_donation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'succeeded'
     and (tg_op = 'INSERT' or old.status is distinct from 'succeeded') then
    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual,
      email_status, sent_at
    ) values (
      new.id,
      'donation',
      coalesce(nullif(trim(new.donor_name),  ''), 'Anonymous donor'),
      coalesce(nullif(trim(new.donor_email), ''), ''),
      new.amount_eur,
      coalesce(nullif(trim(new.description), ''), case when new.recurring then 'Recurring donation' else 'Donation' end),
      coalesce(new.stripe_payment_intent_id, new.stripe_subscription_id, new.gateway),
      'tmpl-donation',
      false,
      'sent',
      now()
    )
    on conflict (type, related_id) where related_id is not null do update
      set payment_reference = coalesce(excluded.payment_reference, public.receipts.payment_reference),
          email_status      = 'sent',
          sent_at           = coalesce(public.receipts.sent_at, now()),
          updated_at        = now();
  end if;
  return new;
end;
$$;

alter function public.auto_create_receipt_for_donation() owner to postgres;

-- ---------------------------------------------------------------------------
-- 5. Update auto_create_receipt_for_membership() with email_status
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_receipt_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name                  text;
  v_email                 text;
  v_amount                numeric(12, 2);
  v_plan_name             text;
  v_monthly_contribution  numeric(12, 2);
  v_metadata              jsonb;
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then

    select m.full_name, m.email, mp.price_eur, mp.name
      into v_name, v_email, v_amount, v_plan_name
      from public.members m
      left join public.membership_plans mp on mp.id = new.plan
     where m.id = new.member_id;

    v_monthly_contribution := coalesce(new.monthly_contribution_eur, 0);

    if v_monthly_contribution >= 1 then
      v_metadata := jsonb_build_object(
        'monthly_contribution_eur', v_monthly_contribution,
        'monthly_start_date',       date_trunc('month', now() at time zone 'utc') + interval '1 month'
      );
    else
      v_metadata := '{}'::jsonb;
    end if;

    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual,
      metadata, email_status, sent_at
    ) values (
      new.id,
      'membership',
      coalesce(v_name, 'Member'),
      coalesce(v_email, ''),
      coalesce(v_amount, 0),
      'Membership – ' || coalesce(v_plan_name, new.plan),
      new.stripe_subscription_id,
      'tmpl-membership',
      false,
      v_metadata,
      case when new.stripe_subscription_id is not null then 'sent' else 'skipped' end,
      case when new.stripe_subscription_id is not null then now() else null end
    )
    on conflict (type, related_id) where related_id is not null do update
      set payment_reference = coalesce(excluded.payment_reference, public.receipts.payment_reference),
          metadata          = case when excluded.metadata <> '{}'::jsonb then excluded.metadata else public.receipts.metadata end,
          email_status      = case when excluded.payment_reference is not null then 'sent' else public.receipts.email_status end,
          sent_at           = coalesce(public.receipts.sent_at, now()),
          updated_at        = now();
  end if;
  return new;
end;
$$;

alter function public.auto_create_receipt_for_membership() owner to postgres;

-- ---------------------------------------------------------------------------
-- 6. Backfill existing ticket receipts: replace 'stripe' with real payment_reference
-- ---------------------------------------------------------------------------
update public.receipts r
set payment_reference = tb.payment_reference,
    updated_at        = now()
from public.ticket_bookings tb
where r.type = 'event'
  and r.related_id = tb.id
  and tb.payment_reference is not null;

-- ---------------------------------------------------------------------------
-- 7. Backfill pending receipts email_status to 'sent' (or 'skipped' for offline)
-- ---------------------------------------------------------------------------
update public.receipts
set email_status = case
      when payment_reference is null and is_manual = false and type = 'membership' then 'skipped'
      else 'sent'
    end,
    sent_at    = coalesce(sent_at, created_at),
    updated_at = now()
where email_status = 'pending';
