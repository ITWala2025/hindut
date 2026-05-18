-- =============================================================================
-- Migration: 20260518000020_remove_fake_media_seeds.sql
-- Purpose : Remove the 6 placeholder media rows seeded in migration 016.
--           These paths do not exist in Supabase Storage and cause blank
--           images in the admin media library.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

delete from public.media
where id in (
  'd0000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000003',
  'd0000001-0000-0000-0000-000000000004',
  'd0000001-0000-0000-0000-000000000005',
  'd0000001-0000-0000-0000-000000000006'
);
