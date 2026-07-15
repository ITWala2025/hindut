-- ===========================================================================
-- Migration: site_settings (singleton public site configuration)
--
-- A single-row table for organisation-wide settings that need to be shown
-- on the public site, starting with the registered charity/trust ID that
-- appears under the logo in the header.
--
-- RLS: everyone (anon + authenticated) may read it — it's shown publicly.
-- Only admin / super_admin may update it.
-- ===========================================================================

create table if not exists public.site_settings (
  id          smallint primary key default 1 check (id = 1),
  trust_id    text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

-- Seed the singleton row if it doesn't already exist
insert into public.site_settings (id, trust_id)
values (1, null)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings
  for select
  using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings
  for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin')
    )
  );

grant select on public.site_settings to anon;
grant select, update on public.site_settings to authenticated;
-- Netlify functions read/write this table via the service_role key, which
-- bypasses RLS entirely; the policies above only guard direct client access.
