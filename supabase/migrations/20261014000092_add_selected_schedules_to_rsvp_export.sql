-- =============================================================================
-- Migration: 20261014000092_add_selected_schedules_to_rsvp_export.sql
-- Purpose : Update export_rsvps_decrypted function to return selected_schedules
--           so CSV exports include multi-day and multi-slot session details.
-- =============================================================================

drop function if exists public.export_rsvps_decrypted(text, uuid, date, date, text);

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
  created_at           timestamptz,
  selected_schedules   jsonb
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
      r.created_at,
      coalesce(r.selected_schedules, '[]'::jsonb)         as selected_schedules
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

-- Only the service_role (Netlify functions) may call this.
revoke all on function public.export_rsvps_decrypted from public, anon, authenticated;
grant execute on function public.export_rsvps_decrypted to service_role;
