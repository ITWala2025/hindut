-- =============================================================================
-- Migration: 20260519000032_media_thumbnail_url.sql
-- Purpose : Add optional thumbnail_url for album-type media rows so a cover
--           image can be shown in the media library grid.
-- =============================================================================

alter table public.media
  add column if not exists thumbnail_url text;

comment on column public.media.thumbnail_url is
  'Optional cover/thumbnail image URL, used for album-type rows.';
