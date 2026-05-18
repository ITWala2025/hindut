-- =============================================================================
-- Migration: 20260518000027_services_use_category_id.sql
-- Purpose : Replace the services.category (text) column with a proper FK
--           services.category_id (uuid) referencing service_categories.id.
-- Safe no-op if migration 20260518000024 already created services with
-- category_id (i.e. fresh installs). Only does real work on databases that
-- had migration 24 applied before it was updated.
-- =============================================================================

-- 1. Add category_id FK if it does not already exist
alter table public.services
  add column if not exists category_id uuid references public.service_categories(id);

-- 2. Backfill category_id from the category text column (only if it exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'services'
      and column_name  = 'category'
  ) then
    update public.services s
    set    category_id = sc.id
    from   public.service_categories sc
    where  sc.name = s.category
      and  s.category_id is null;
  end if;
end;
$$;

-- 3. Drop the old text column if it still exists
alter table public.services
  drop column if exists category;

-- 4. Index for fast lookups by category
create index if not exists services_category_id_idx
  on public.services (category_id);
