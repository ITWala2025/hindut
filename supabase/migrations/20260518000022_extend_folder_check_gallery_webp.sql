-- =============================================================================
-- Migration: 20260518000022_extend_folder_check_gallery_webp.sql
-- Purpose : Add 'gallery-webp' to the media.folder check constraint, then
--           rename existing 'gallery' rows to 'gallery-webp'.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. Drop the existing constraint
alter table public.media
  drop constraint if exists media_folder_check;

-- 2. Rename 'gallery' rows while no constraint is active
update public.media
set folder = 'gallery-webp'
where folder = 'gallery';

-- 3. Re-add constraint with 'gallery-webp' (all rows are now valid)
alter table public.media
  add constraint media_folder_check
  check (folder is null or folder in ('events', 'temple', 'community', 'general', 'gallery-webp'));
