-- Auto-expire events whose start_date has passed, and auto-reactivate
-- when an admin moves the date back to the future.
--
-- Logic:
--   • start_date < today  → published = false  (expired)
--   • start_date >= today → published = true   (active/upcoming)
--
-- This fires BEFORE INSERT OR UPDATE so the stored value is always correct.

CREATE OR REPLACE FUNCTION public.auto_manage_event_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_date < CURRENT_DATE THEN
    NEW.published := false;
  ELSE
    NEW.published := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Fire on INSERT and whenever start_date is explicitly updated
DROP TRIGGER IF EXISTS trg_auto_manage_event_published ON public.events;
CREATE TRIGGER trg_auto_manage_event_published
  BEFORE INSERT OR UPDATE OF start_date ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_manage_event_published();

-- Bulk-expire all existing events whose date has already passed
UPDATE public.events
SET published = false
WHERE start_date < CURRENT_DATE
  AND published = true;
