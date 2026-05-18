-- =============================================================================
-- Migration: 20260518000023_grant_anon_media_read.sql
-- Purpose : Grant SELECT on public.media to the anon role so the public
--           site (unauthenticated) can load gallery images.
--           The media_public_read RLS policy already restricts to
--           bucket = 'public-gallery', so no extra data is exposed.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

grant select on public.media to anon;
