-- =============================================================================
-- Migration: 20260522000043_create_analytics.sql
-- Purpose : First-party site analytics. Captures sessions + page-view /
--           interaction events with geo, device, and engagement signals.
--           Designed to be GDPR-friendly: no PII, IP is hashed, visitor_id
--           is a client-generated UUID (not linked to auth users).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- analytics_sessions: one row per browser session (sessionStorage scope).
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_sessions (
  id              uuid        primary key default uuid_generate_v4(),
  visitor_id      text        not null,
  session_key     text        not null unique,
  ip_hash         text,
  country         text,
  country_code    text,
  region          text,
  city            text,
  latitude        double precision,
  longitude       double precision,
  timezone        text,
  user_agent      text,
  browser         text,
  browser_version text,
  os              text,
  device_type     text check (device_type in ('desktop', 'mobile', 'tablet', 'bot', 'other')),
  screen_width    integer,
  screen_height   integer,
  viewport_width  integer,
  viewport_height integer,
  language        text,
  referrer        text,
  referrer_host   text,
  landing_path    text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  started_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  pageviews       integer     not null default 0,
  events_count    integer     not null default 0,
  total_duration_ms bigint    not null default 0
);

create index if not exists analytics_sessions_started_at_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_visitor_idx    on public.analytics_sessions (visitor_id);
create index if not exists analytics_sessions_country_idx    on public.analytics_sessions (country_code);

-- ---------------------------------------------------------------------------
-- analytics_events: page views, time-on-page, scroll, clicks, custom events.
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id              uuid        primary key default uuid_generate_v4(),
  session_id      uuid        references public.analytics_sessions(id) on delete cascade,
  session_key     text        not null,
  visitor_id      text        not null,
  event_type      text        not null check (event_type in
                    ('pageview', 'pageleave', 'click', 'scroll', 'custom', 'error', 'engagement')),
  path            text        not null,
  full_url        text,
  page_title      text,
  referrer        text,
  referrer_host   text,
  country         text,
  country_code    text,
  city            text,
  device_type     text,
  browser         text,
  os              text,
  duration_ms     integer,
  scroll_depth    integer,    -- 0..100
  viewport_width  integer,
  viewport_height integer,
  metadata        jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx   on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_idx      on public.analytics_events (session_id);
create index if not exists analytics_events_path_idx         on public.analytics_events (path);
create index if not exists analytics_events_type_idx         on public.analytics_events (event_type);
create index if not exists analytics_events_country_idx      on public.analytics_events (country_code);
create index if not exists analytics_events_visitor_idx      on public.analytics_events (visitor_id);

-- ---------------------------------------------------------------------------
-- Row-Level Security
--   - Public/anon can INSERT events + sessions (writes are required from the
--     unauthenticated public site). No PII is stored; payloads are validated
--     server-side by the Netlify function (which uses service_role anyway).
--   - Authenticated admin/editor can SELECT for the dashboard.
-- ---------------------------------------------------------------------------
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events   enable row level security;

drop policy if exists analytics_sessions_insert_any on public.analytics_sessions;
create policy analytics_sessions_insert_any on public.analytics_sessions
  for insert
  with check (true);

drop policy if exists analytics_sessions_update_any on public.analytics_sessions;
create policy analytics_sessions_update_any on public.analytics_sessions
  for update
  using (true)
  with check (true);

drop policy if exists analytics_sessions_staff_select on public.analytics_sessions;
create policy analytics_sessions_staff_select on public.analytics_sessions
  for select
  using (public.current_user_role() in ('admin', 'editor'));

drop policy if exists analytics_events_insert_any on public.analytics_events;
create policy analytics_events_insert_any on public.analytics_events
  for insert
  with check (true);

drop policy if exists analytics_events_staff_select on public.analytics_events;
create policy analytics_events_staff_select on public.analytics_events
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Grants ---------------------------------------------------------------------
grant insert, update on public.analytics_sessions to anon, authenticated;
grant insert         on public.analytics_events   to anon, authenticated;
grant select         on public.analytics_sessions to authenticated;
grant select         on public.analytics_events   to authenticated;
grant all            on public.analytics_sessions to service_role;
grant all            on public.analytics_events   to service_role;

-- ---------------------------------------------------------------------------
-- Helper view: daily traffic summary.
-- ---------------------------------------------------------------------------
create or replace view public.analytics_daily as
select
  date_trunc('day', created_at)::date            as day,
  count(*) filter (where event_type = 'pageview') as pageviews,
  count(distinct visitor_id)                      as unique_visitors,
  count(distinct session_key)                     as sessions,
  coalesce(avg(duration_ms) filter (where event_type = 'pageleave' and duration_ms > 0), 0)::integer
                                                  as avg_duration_ms
from public.analytics_events
group by 1
order by 1 desc;

grant select on public.analytics_daily to authenticated;
