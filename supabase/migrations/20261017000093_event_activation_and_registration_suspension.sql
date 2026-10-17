-- =============================================================================
-- Migration: 20261017000093_event_activation_and_registration_suspension.sql
-- Purpose : 
--   1. Drop auto-expire trigger so event activation/deactivation is explicitly
--      managed by admins via public.events.published.
--   2. Add registration_suspended and registration_suspended_message columns
--      to allow admins to halt RSVPs and ticket sales while keeping events visible.
-- =============================================================================

-- 1. Drop the automatic date expiration trigger on public.events
DROP TRIGGER IF EXISTS trg_auto_manage_event_published ON public.events;

-- Optional cleanup of the function (or replace with no-op)
CREATE OR REPLACE FUNCTION public.auto_manage_event_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- No-op: published is explicitly managed by administrators
  RETURN NEW;
END;
$$;

-- 2. Add registration suspension columns to public.events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_suspended_message text;

-- 3. Create index for fast lookups if not exists
CREATE INDEX IF NOT EXISTS events_registration_suspended_idx
  ON public.events (registration_suspended);

COMMENT ON COLUMN public.events.published IS 'Controls whether the event is active and visible on public pages (true) or deactivated and hidden (false).';
COMMENT ON COLUMN public.events.registration_suspended IS 'When true, public registration (RSVP/ticket purchase) is disallowed with an explanatory message.';
COMMENT ON COLUMN public.events.registration_suspended_message IS 'Optional custom message shown to public users when registration is suspended.';
