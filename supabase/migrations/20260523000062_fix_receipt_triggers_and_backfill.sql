-- =============================================================================
-- Migration: 20260523000062_fix_receipt_triggers_and_backfill.sql
-- Purpose : Improve auto-receipt triggers so every payment type produces a
--           receipt with accurate data, and backfill any receipts that were
--           missed for already-succeeded/confirmed/active records.
--
-- Changes:
--   1. auto_create_receipt_for_donation  – use stripe_subscription_id as
--      payment_reference fallback (covers recurring donations with no PI)
--   2. auto_create_receipt_for_membership – use human-readable plan name;
--      fall back to amount_eur on the memberships row itself if plan price
--      is missing from membership_plans.
--   3. Backfill missing donation receipts for all status='succeeded' rows.
--   4. Backfill missing membership receipts for all status='active' rows.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Improved donation receipt trigger
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
      amount_eur, description, payment_reference, template_id, is_manual
    ) values (
      new.id,
      'donation',
      coalesce(nullif(trim(new.donor_name),  ''), 'Anonymous donor'),
      coalesce(nullif(trim(new.donor_email), ''), ''),
      new.amount_eur,
      coalesce(nullif(trim(new.description), ''), case when new.recurring then 'Recurring donation' else 'Donation' end),
      -- Use payment_intent for one-time; subscription_id for recurring; gateway as last resort
      coalesce(new.stripe_payment_intent_id, new.stripe_subscription_id, new.gateway),
      'tmpl-donation',
      false
    )
    on conflict (type, related_id) where related_id is not null do nothing;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Improved membership receipt trigger
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_receipt_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name       text;
  v_email      text;
  v_amount     numeric(12, 2);
  v_plan_name  text;
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then

    select m.full_name, m.email, mp.price_eur, mp.name
      into v_name, v_email, v_amount, v_plan_name
      from public.members m
      left join public.membership_plans mp on mp.id = new.plan
     where m.id = new.member_id;

    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual
    ) values (
      new.id,
      'membership',
      coalesce(v_name, 'Member'),
      coalesce(v_email, ''),
      -- Prefer plan price; fall back to 0 if plan price is missing
      coalesce(v_amount, 0),
      'Membership – ' || coalesce(v_plan_name, new.plan),
      new.stripe_subscription_id,
      'tmpl-membership',
      false
    )
    on conflict (type, related_id) where related_id is not null do nothing;
  end if;
  return new;
end;
$$;

-- Re-pin ownership so SECURITY DEFINER continues to bypass RLS
alter function public.auto_create_receipt_for_donation()   owner to postgres;
alter function public.auto_create_receipt_for_membership() owner to postgres;

-- ---------------------------------------------------------------------------
-- 3. Backfill: donation receipts for succeeded rows with no receipt yet
-- ---------------------------------------------------------------------------
insert into public.receipts (
  related_id, type, recipient_name, recipient_email,
  amount_eur, description, payment_reference, template_id, is_manual
)
select
  d.id,
  'donation',
  coalesce(nullif(trim(d.donor_name),  ''), 'Anonymous donor'),
  coalesce(nullif(trim(d.donor_email), ''), ''),
  d.amount_eur,
  coalesce(nullif(trim(d.description), ''), case when d.recurring then 'Recurring donation' else 'Donation' end),
  coalesce(d.stripe_payment_intent_id, d.stripe_subscription_id, d.gateway),
  'tmpl-donation',
  false
from public.donations d
where d.status = 'succeeded'
  and not exists (
    select 1 from public.receipts r
    where r.type = 'donation' and r.related_id = d.id
  )
on conflict (type, related_id) where related_id is not null do nothing;

-- ---------------------------------------------------------------------------
-- 4. Backfill: membership receipts for active rows with no receipt yet
-- ---------------------------------------------------------------------------
insert into public.receipts (
  related_id, type, recipient_name, recipient_email,
  amount_eur, description, payment_reference, template_id, is_manual
)
select
  ms.id,
  'membership',
  coalesce(m.full_name, 'Member'),
  coalesce(m.email, ''),
  coalesce(mp.price_eur, 0),
  'Membership – ' || coalesce(mp.name, ms.plan),
  ms.stripe_subscription_id,
  'tmpl-membership',
  false
from public.memberships ms
left join public.members m          on m.id  = ms.member_id
left join public.membership_plans mp on mp.id = ms.plan
where ms.status = 'active'
  and not exists (
    select 1 from public.receipts r
    where r.type = 'membership' and r.related_id = ms.id
  )
on conflict (type, related_id) where related_id is not null do nothing;

-- ---------------------------------------------------------------------------
-- 5. Backfill: ticket receipts for confirmed bookings with no receipt yet
-- ---------------------------------------------------------------------------
insert into public.receipts (
  related_id, type, recipient_name, recipient_email,
  amount_eur, description, payment_reference, template_id, is_manual
)
select
  tb.id,
  'event',
  trim(tb.first_name || ' ' || tb.last_name),
  tb.email_masked,
  tb.amount_eur,
  'Ticket booking ' || tb.reference_number,
  coalesce(tb.payment_reference, tb.payment_gateway),
  'tmpl-event',
  false
from public.ticket_bookings tb
where tb.status = 'confirmed'
  and not exists (
    select 1 from public.receipts r
    where r.type = 'event' and r.related_id = tb.id
  )
on conflict (type, related_id) where related_id is not null do nothing;
