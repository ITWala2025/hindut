-- =============================================================================
-- Migration: 20260519000036_add_events_missing_columns.sql
-- Purpose : Add columns referenced in useEvents.ts and rsvp-submit.ts that
--           were not included in the original create_events migration.
--           Uses IF NOT EXISTS guards so it is safe to re-run.
-- =============================================================================

-- time_display: human-readable time string shown on event cards / emails
-- e.g. "18:30" or "6:30 PM" — set by admin, not derived from start_date.
alter table public.events
  add column if not exists time_display text;

-- category: event category tag matching EventCategory union in types.ts
-- e.g. 'religious' | 'cultural' | 'educational' | 'community'
alter table public.events
  add column if not exists category text
    check (category in ('religious','cultural','educational','community','charity','social'));

-- ticket_tiers: optional JSONB array of { name, price, capacity } for
-- multi-tier ticketed events (e.g. VIP / General / Child).
alter table public.events
  add column if not exists ticket_tiers jsonb;
