-- Add optional image_url column to team_members for profile photos
alter table public.team_members
  add column if not exists image_url text;
