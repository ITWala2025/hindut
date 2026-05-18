-- =============================================================================
-- Migration: 20260518000021_rename_gallery_folder.sql
-- Purpose : Rename the 'gallery' folder value to 'gallery-webp' in the
--           public.media table so it matches the actual Supabase Storage
--           subfolder path (gallery-webp/{filename}).
-- Run this in the Supabase SQL Editor.
-- =============================================================================

update public.media
set folder = 'gallery-webp'
where folder = 'gallery';
