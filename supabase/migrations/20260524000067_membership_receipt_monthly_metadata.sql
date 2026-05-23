-- =============================================================================
-- Migration: 20260524000067_membership_receipt_monthly_metadata.sql
-- Purpose : Ensure annual membership receipts include monthly contribution
--           metadata so the PDF can render the monthly subscription band.
--
-- Changes:
--   1. Update auto_create_receipt_for_membership() to read NEW.monthly_contribution_eur
--      and embed it in the receipt metadata when status first becomes 'active'.
--   2. Add trigger function sync_receipt_metadata_for_membership() + trigger that
--      fires when monthly_contribution_eur changes on an already-active membership
--      (covers the Stripe webhook path where monthly_contribution_eur is set in a
--       separate UPDATE after status was already set to 'active').
--   3. Backfill: update existing membership receipts that are missing the monthly
--      contribution metadata but whose membership row already has the value set.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Updated membership receipt trigger: embed monthly contribution in metadata
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_receipt_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name       text;
  v_email      text;
  v_amount     numeric(12, 2);
  v_plan_name  text;
  v_metadata   jsonb;
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then

    select m.full_name, m.email, mp.price_eur, mp.name
      into v_name, v_email, v_amount, v_plan_name
      from public.members m
      left join public.membership_plans mp on mp.id = new.plan
     where m.id = new.member_id;

    -- Build receipt metadata; include monthly contribution if already set
    v_metadata := '{}'::jsonb;
    if new.monthly_contribution_eur is not null and new.monthly_contribution_eur >= 1 then
      v_metadata := jsonb_build_object(
        'monthly_contribution_eur', new.monthly_contribution_eur,
        'monthly_start_date',
          to_char(
            date_trunc('month', now()) + interval '1 month',
            'YYYY-MM-DD"T"HH24:MI:SS"Z"'
          )
      );
    end if;

    insert into public.receipts (
      related_id, type, recipient_name, recipient_email,
      amount_eur, description, payment_reference, template_id, is_manual,
      metadata
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
      v_metadata
    )
    on conflict (type, related_id) where related_id is not null do nothing;
  end if;
  return new;
end;
$$;

alter function public.auto_create_receipt_for_membership() owner to postgres;

-- ---------------------------------------------------------------------------
-- 2. New trigger: sync receipt metadata when monthly_contribution_eur is set
--    on an already-active membership (covers the separate webhook UPDATE path)
-- ---------------------------------------------------------------------------
create or replace function public.sync_receipt_metadata_for_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Fire when monthly_contribution_eur is set (or changed) on an active membership
  if new.status = 'active'
     and new.monthly_contribution_eur is not null
     and new.monthly_contribution_eur >= 1
     and (old.monthly_contribution_eur is distinct from new.monthly_contribution_eur) then

    update public.receipts
       set metadata = jsonb_build_object(
             'monthly_contribution_eur', new.monthly_contribution_eur,
             'monthly_start_date',
               to_char(
                 date_trunc('month', now()) + interval '1 month',
                 'YYYY-MM-DD"T"HH24:MI:SS"Z"'
               )
           )
     where type       = 'membership'
       and related_id = new.id
       and (metadata is null
            or metadata = '{}'::jsonb
            or metadata -> 'monthly_contribution_eur' is null);
  end if;
  return new;
end;
$$;

alter function public.sync_receipt_metadata_for_membership() owner to postgres;

drop trigger if exists memberships_sync_receipt_metadata on public.memberships;
create trigger memberships_sync_receipt_metadata
  after update on public.memberships
  for each row execute function public.sync_receipt_metadata_for_membership();

-- Grant EXECUTE consistently with the other trigger functions
revoke execute on function public.sync_receipt_metadata_for_membership() from public;
grant  execute on function public.sync_receipt_metadata_for_membership() to postgres;

-- ---------------------------------------------------------------------------
-- 3. Backfill: update existing receipts that are missing monthly contribution
--    metadata where the membership row already has monthly_contribution_eur set
-- ---------------------------------------------------------------------------
update public.receipts r
   set metadata = jsonb_build_object(
         'monthly_contribution_eur', m.monthly_contribution_eur,
         'monthly_start_date',
           to_char(
             date_trunc('month', coalesce(m.started_at, m.created_at)) + interval '1 month',
             'YYYY-MM-DD"T"HH24:MI:SS"Z"'
           )
       )
  from public.memberships m
 where r.type       = 'membership'
   and r.related_id = m.id
   and m.monthly_contribution_eur is not null
   and m.monthly_contribution_eur >= 1
   and (r.metadata is null
        or r.metadata = '{}'::jsonb
        or r.metadata -> 'monthly_contribution_eur' is null);
