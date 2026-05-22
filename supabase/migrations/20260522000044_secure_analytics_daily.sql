-- =============================================================================
-- Migration: 20260522000044_secure_analytics_daily.sql
-- Purpose : Lock down public.analytics_daily.
--
-- Why     : Postgres views run with the view-owner's privileges, which
--           bypasses RLS on the underlying analytics_events table. The
--           Supabase linter (correctly) flags this as "unrestricted".
--
-- Fix     : Recreate the view with `security_invoker = true` so it executes
--           with the caller's role and therefore respects the staff-only
--           SELECT policy on analytics_events. Also revoke access from
--           `anon` and grant only to `authenticated`.
-- =============================================================================

drop view if exists public.analytics_daily;

create view public.analytics_daily
with (security_invoker = true)
as
select
  date_trunc('day', created_at)::date              as day,
  count(*) filter (where event_type = 'pageview')  as pageviews,
  count(distinct visitor_id)                       as unique_visitors,
  count(distinct session_key)                      as sessions,
  coalesce(
    avg(duration_ms) filter (where event_type = 'pageleave' and duration_ms > 0),
    0
  )::integer                                       as avg_duration_ms
from public.analytics_events
group by 1
order by 1 desc;

revoke all on public.analytics_daily from public, anon;
grant  select on public.analytics_daily to authenticated;
