-- =============================================================================
-- Migration: 20260624000084_auto_member_code_trigger.sql
-- Purpose : Auto-generate member_code (HAI-MMYYYY-XXXX) for every new member
--           at INSERT time, so codes are assigned immediately regardless of
--           whether the Stripe payment completes.
--
--           Also backfills existing members that currently have no code.
-- =============================================================================

-- ── Trigger function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_generate_member_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count  bigint;
  v_mm     text;
  v_yyyy   text;
BEGIN
  -- No-op when code already supplied (e.g. admin manual entry or backfill)
  IF NEW.member_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent inserts so each gets a unique sequence number
  PERFORM pg_advisory_xact_lock(hashtext('member_code_gen'));

  SELECT COUNT(*) INTO v_count
  FROM public.members
  WHERE member_code LIKE 'HAI-%';

  v_mm   := LPAD(EXTRACT(MONTH  FROM now())::text, 2, '0');
  v_yyyy := EXTRACT(YEAR FROM now())::text;

  NEW.member_code := 'HAI-' || v_mm || v_yyyy || '-' || LPAD((v_count + 1)::text, 4, '0');

  RETURN NEW;
END;
$$;

-- ── Attach trigger ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS members_auto_member_code ON public.members;
CREATE TRIGGER members_auto_member_code
  BEFORE INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_member_code();

-- ── Backfill existing members that have no code ───────────────────────────────
-- Process in joined_at order so earlier members get lower sequence numbers.
DO $$
DECLARE
  r      RECORD;
  v_count bigint;
  v_mm    text;
  v_yyyy  text;
  v_code  text;
BEGIN
  FOR r IN
    SELECT id FROM public.members
    WHERE member_code IS NULL
    ORDER BY joined_at ASC
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext('member_code_gen'));

    SELECT COUNT(*) INTO v_count
    FROM public.members
    WHERE member_code LIKE 'HAI-%';

    v_mm   := LPAD(EXTRACT(MONTH  FROM now())::text, 2, '0');
    v_yyyy := EXTRACT(YEAR FROM now())::text;
    v_code := 'HAI-' || v_mm || v_yyyy || '-' || LPAD((v_count + 1)::text, 4, '0');

    UPDATE public.members
    SET member_code = v_code
    WHERE id = r.id
      AND member_code IS NULL;  -- guard against race
  END LOOP;
END;
$$;
