-- =============================================================================
-- Migration: 20260907000091_add_multi_day_events_and_rsvp_slots.sql
-- Purpose : Add columns for multi-day events, schedule slots, attendance conditions,
--           and RSVP selected schedules.
-- =============================================================================

-- 1. Add multi-day & schedule fields to public.events
alter table public.events
  add column if not exists is_multi_day boolean not null default false,
  add column if not exists schedules jsonb not null default '[]'::jsonb,
  add column if not exists attendance_conditions jsonb;

-- 2. Add selected_schedules column to public.event_rsvps
alter table public.event_rsvps
  add column if not exists selected_schedules jsonb not null default '[]'::jsonb;
