-- =============================================================================
-- Migration: 20260520000042_receipts_crud_and_auto_generation.sql
-- Purpose : Rework receipt management.
--           1. Adds receipt_number auto-generation (sequence + trigger).
--           2. Adds is_manual, payment_reference, issued_date, metadata,
--              created_by, updated_at columns.
--           3. Allows related_id to be NULL (for manual / offline receipts).
--           4. Adds triggers that auto-create receipts when:
--                - a donation transitions to status = 'succeeded'
--                - a ticket booking transitions to status = 'confirmed'
--                - a membership transitions to status = 'active'
--           5. Backfills receipts for existing eligible records.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------------
alter table public.receipts
  add column if not exists is_manual         boolean      not null default false,
  add column if not exists payment_reference text,
  add column if not exists issued_date       date         not null default current_date,
  add column if not exists metadata          jsonb        not null default '{}'::jsonb,
  add column if not exists created_by        uuid         references auth.users(id) on delete set null,
  add column if not exists updated_at        timestamptz  not null default now();

-- Manual receipts may not be tied to a related record.
alter table public.receipts alter column related_id drop not null;

-- Drop the existing unique index (it forbids NULL related_id duplicates only on
-- some configurations; replace it with a partial unique index that ignores NULLs).
drop index if exists public.receipts_type_related_idx;
create unique index if not exists receipts_type_related_idx
  on public.receipts (type, related_id)
  where related_id is not null;

create index if not exists receipts_is_manual_idx on public.receipts (is_manual);

-- ---------------------------------------------------------------------------
-- 2. Receipt number auto-generation
-- ---------------------------------------------------------------------------
create sequence if not exists public.receipt_number_seq start 1;
grant usage, select on sequence public.receipt_number_seq to authenticated, service_role;

create or replace function public.generate_receipt_number()
returns trigger
language plpgsql
as $$
declare
  yr text := to_char(current_date, 'YYYY');
  n  bigint;
begin
  if new.receipt_number is null or new.receipt_number = '' then
    n := nextval('public.receipt_number_seq');
    new.receipt_number := 'HAI/' || yr || '/' || lpad(n::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists receipts_set_number on public.receipts;
create trigger receipts_set_number
  before insert on public.receipts
  for each row execute function public.generate_receipt_number();

drop trigger if exists receipts_set_updated_at on public.receipts;
create trigger receipts_set_updated_at
  before update on public.receipts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Auto-generation triggers
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
      new.id, 'donation',
      coalesce(nullif(trim(new.donor_name),  ''), 'Anonymous donor'),
      coalesce(nullif(trim(new.donor_email), ''), ''),
      new.amount_eur,
      coalesce(new.description, 'Donation'),
      coalesce(new.stripe_payment_intent_id, new.gateway),
      'tmpl-donation',
      false
    )
    on conflict (type, related_id) where related_id is not null do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.auto_create_receipt_for_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual
    ) values (
      new.id, 'event',
      trim(new.first_name || ' ' || new.last_name),
      new.email_masked,
      new.amount_eur,
      'Ticket booking ' || new.reference_number,
      coalesce(new.payment_reference, new.payment_gateway),
      'tmpl-event',
      false
    )
    on conflict (type, related_id) where related_id is not null do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.auto_create_receipt_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text;
  v_email  text;
  v_amount numeric(12, 2);
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select m.full_name, m.email, mp.price_eur
      into v_name, v_email, v_amount
      from public.members m
      left join public.membership_plans mp on mp.id = new.plan
     where m.id = new.member_id;

    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual
    ) values (
      new.id, 'membership',
      coalesce(v_name, 'Member'),
      coalesce(v_email, ''),
      coalesce(v_amount, 0),
      'Membership plan: ' || new.plan,
      new.stripe_subscription_id,
      'tmpl-membership',
      false
    )
    on conflict (type, related_id) where related_id is not null do nothing;
  end if;
  return new;
end;
$$;

-- Pin SECURITY DEFINER owners to postgres so RLS is correctly bypassed.
alter function public.auto_create_receipt_for_donation()   owner to postgres;
alter function public.auto_create_receipt_for_ticket()     owner to postgres;
alter function public.auto_create_receipt_for_membership() owner to postgres;

drop trigger if exists donations_auto_receipt on public.donations;
create trigger donations_auto_receipt
  after insert or update of status on public.donations
  for each row execute function public.auto_create_receipt_for_donation();

drop trigger if exists ticket_bookings_auto_receipt on public.ticket_bookings;
create trigger ticket_bookings_auto_receipt
  after insert or update of status on public.ticket_bookings
  for each row execute function public.auto_create_receipt_for_ticket();

drop trigger if exists memberships_auto_receipt on public.memberships;
create trigger memberships_auto_receipt
  after insert or update of status on public.memberships
  for each row execute function public.auto_create_receipt_for_membership();

-- ---------------------------------------------------------------------------
-- 4. Backfill receipts for existing eligible records
-- ---------------------------------------------------------------------------
insert into public.receipts (
  related_id, type, recipient_name, recipient_email,
  amount_eur, description, payment_reference, template_id, is_manual
)
select
  d.id, 'donation',
  coalesce(nullif(trim(d.donor_name),  ''), 'Anonymous donor'),
  coalesce(nullif(trim(d.donor_email), ''), ''),
  d.amount_eur,
  coalesce(d.description, 'Donation'),
  coalesce(d.stripe_payment_intent_id, d.gateway),
  'tmpl-donation', false
from public.donations d
where d.status = 'succeeded'
on conflict (type, related_id) where related_id is not null do nothing;

insert into public.receipts (
  related_id, type, recipient_name, recipient_email,
  amount_eur, description, payment_reference, template_id, is_manual
)
select
  tb.id, 'event',
  trim(tb.first_name || ' ' || tb.last_name),
  tb.email_masked,
  tb.amount_eur,
  'Ticket booking ' || tb.reference_number,
  coalesce(tb.payment_reference, tb.payment_gateway),
  'tmpl-event', false
from public.ticket_bookings tb
where tb.status = 'confirmed'
on conflict (type, related_id) where related_id is not null do nothing;

insert into public.receipts (
  related_id, type, recipient_name, recipient_email,
  amount_eur, description, payment_reference, template_id, is_manual
)
select
  m.id, 'membership',
  coalesce(mem.full_name, 'Member'),
  coalesce(mem.email, ''),
  coalesce(mp.price_eur, 0),
  'Membership plan: ' || m.plan,
  m.stripe_subscription_id,
  'tmpl-membership', false
from public.memberships m
left join public.members          mem on mem.id = m.member_id
left join public.membership_plans mp  on mp.id  = m.plan
where m.status = 'active'
on conflict (type, related_id) where related_id is not null do nothing;

-- ---------------------------------------------------------------------------
-- 5. Backfill receipt_number for any pre-existing rows without one
-- ---------------------------------------------------------------------------
update public.receipts
   set receipt_number = 'HAI/' || to_char(coalesce(created_at, now()), 'YYYY') ||
                        '/' || lpad(nextval('public.receipt_number_seq')::text, 5, '0')
 where receipt_number is null or receipt_number = '';

