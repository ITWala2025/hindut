-- =============================================================================
-- Migration: 20260519000031_media_type_column.sql
-- Purpose : Add media_type to distinguish single images from photo albums.
-- =============================================================================

alter table public.media
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'album'));

comment on column public.media.media_type is
  'image = a single image file/URL; album = a link to an external photo album (e.g. Google Photos)';
