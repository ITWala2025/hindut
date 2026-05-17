-- =============================================================================
-- Migration: 20260517000011_notify_triggers.sql
-- Purpose : Postgres trigger functions that emit pg_notify events on changes
--           to memberships, donations, and tickets. Supabase Edge Functions
--           subscribe to these channels (or Realtime) to react asynchronously
--           (e.g. send receipt emails, sync Stripe).
-- =============================================================================

-- ---- memberships -----------------------------------------------------------
create or replace function public.notify_membership_change()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'membership_change',
    json_build_object(
      'op',     tg_op,
      'id',     coalesce(new.id, old.id),
      'record', row_to_json(new)
    )::text
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists membership_change on public.memberships;
create trigger membership_change
  after insert or update on public.memberships
  for each row execute function public.notify_membership_change();

-- ---- donations -------------------------------------------------------------
create or replace function public.notify_donation_change()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'donation_change',
    json_build_object(
      'op',     tg_op,
      'id',     coalesce(new.id, old.id),
      'record', row_to_json(new)
    )::text
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists donation_change on public.donations;
create trigger donation_change
  after insert or update on public.donations
  for each row execute function public.notify_donation_change();

-- ---- tickets ---------------------------------------------------------------
create or replace function public.notify_ticket_change()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'ticket_change',
    json_build_object(
      'op',     tg_op,
      'id',     coalesce(new.id, old.id),
      'record', row_to_json(new)
    )::text
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists ticket_change on public.tickets;
create trigger ticket_change
  after insert or update on public.tickets
  for each row execute function public.notify_ticket_change();
