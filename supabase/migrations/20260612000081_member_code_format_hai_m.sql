-- =============================================================================
-- Migration: 20260612000081_member_code_format_hai_m.sql
-- Purpose : Change member_code format from HAI-YYYY-MM-XXXX to HAI-M-XXXX.
--           Backfills all existing codes, preserving relative order.
--           Safe to re-run (no-ops if no old-format codes remain).
-- =============================================================================

-- Reassign existing HAI-YYYY-MM-XXXX codes to HAI-M-XXXX using their
-- alphabetical order (which matches chronological order since YYYY-MM is first).
-- New codes share no prefix overlap with old codes so the unique constraint
-- will not fire intermediate violations within a single UPDATE statement.
WITH ranked AS (
  SELECT id,
         'HAI-M-' || LPAD(ROW_NUMBER() OVER (ORDER BY member_code)::text, 4, '0') AS new_code
  FROM public.members
  WHERE member_code IS NOT NULL
    AND member_code ~ '^HAI-[0-9]{4}-[0-9]{2}-[0-9]{4}$'
)
UPDATE public.members m
   SET member_code = r.new_code
  FROM ranked r
 WHERE m.id = r.id;
