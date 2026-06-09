create table if not exists public.news_updates (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  excerpt     text not null default '',
  content     text not null default '',
  image_url   text,
  category    text not null default 'announcement',
  published   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.news_updates enable row level security;

-- Public can read published news
create policy "Public read published news"
  on public.news_updates
  for select
  using (published = true);

-- Authenticated users (admins) can do anything
create policy "Admins full access news"
  on public.news_updates
  for all
  to authenticated
  using (true)
  with check (true);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger news_updates_updated_at
  before update on public.news_updates
  for each row execute function public.set_updated_at();

-- Grant table-level access so RLS policies can actually apply
grant select on public.news_updates to anon;
grant select, insert, update, delete on public.news_updates to authenticated;
