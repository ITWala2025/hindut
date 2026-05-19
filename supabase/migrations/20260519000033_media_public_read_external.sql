-- =============================================================================
-- Migration: 20260519000033_media_public_read_external.sql
-- Purpose : Allow anonymous users to read external media (bucket = 'external')
--           so that external-link images and album cards appear on the public
--           home-page photo gallery.
-- =============================================================================

drop policy if exists media_public_read on public.media;

create policy media_public_read on public.media
  for select
  using (bucket in ('public-gallery', 'external'));
