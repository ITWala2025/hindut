-- Migration: 20260518000029_fix_event_rsvps_grants.sql
-- Problem: event_rsvps only had GRANT to service_role.
-- PostgreSQL checks GRANTs before evaluating RLS policies, so authenticated
-- admin/editor users received "permission denied" even though a valid RLS
-- policy existed. Fix: grant the minimum required privileges to authenticated;
-- RLS policies already restrict access to admin/editor only.

-- Allow the Supabase anon/authenticated roles to interact with event_rsvps.
-- SELECT: RLS policy (event_rsvps_staff_select) gates this to admin & editor.
-- UPDATE: RLS policy (event_rsvps_admin_update)  gates this to admin only.
-- INSERT: still service_role only (done via rsvp-submit Netlify Function).
grant select, update on public.event_rsvps to authenticated;

-- Also ensure the events join used by useRsvps (events!inner(title)) is readable.
-- events table should already have this grant from its own migration, but
-- make it explicit to be safe.
grant select on public.events to authenticated;
