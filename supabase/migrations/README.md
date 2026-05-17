# Supabase Migrations

These SQL files implement the Phase‑2 Supabase backend described in
[`Plan/DATABASE_SCHEMA.md`](../../Plan/DATABASE_SCHEMA.md) and
[`Plan/PHASE2_PLAN.md`](../../Plan/PHASE2_PLAN.md).

> The files are intended to be applied **manually** through the Supabase SQL
> editor (or `supabase db push`). Nothing in this folder runs automatically.

## Apply order

Run the files in ascending filename order. Each file is idempotent
(`create … if not exists`, `drop policy if exists` before `create policy`,
`on conflict do nothing` for seeds) so they can be re-run safely.

| # | File | Contents |
|---|------|----------|
| 1 | `20260517000001_init_extensions_and_user_role.sql` | Enable `uuid-ossp` / `pgcrypto`, add `role` column to `auth.users`, helper `current_user_role()`. |
| 2 | `20260517000002_create_members.sql` | `members` table + RLS. |
| 3 | `20260517000003_create_memberships.sql` | `memberships` table, `updated_at` trigger, RLS. |
| 4 | `20260517000004_create_donations.sql` | `donations` table (Stripe / PayPal / SumUp) + RLS. |
| 5 | `20260517000005_create_events.sql` | `events` table + RLS (public read for published events). |
| 6 | `20260517000006_create_tickets.sql` | `tickets` table + RLS. |
| 7 | `20260517000007_create_receipts.sql` | `receipts` + `receipt_templates` tables + RLS. |
| 8 | `20260517000008_create_media.sql` | `media` metadata table + RLS. |
| 9 | `20260517000009_create_seo_meta.sql` | `seo_meta` table + RLS. |
| 10 | `20260517000010_storage_buckets.sql` | Creates `public-gallery`, `receipts`, `receipt-templates` storage buckets and their `storage.objects` policies. |
| 11 | `20260517000011_notify_triggers.sql` | `pg_notify` triggers on `memberships`, `donations`, `tickets` consumed by Edge Functions. |
| 12 | `20260517000012_seed_receipt_templates.sql` | Seed default receipt template rows. |

## Roles

RLS policies expect each authenticated user to carry a `role` of either
`admin` or `editor` in `auth.users.role` (added in migration 1). Set this
column manually for the first admin:

```sql
update auth.users set role = 'admin' where email = 'admin@hindut.ie';
```

## Edge Functions

Migration 11 emits notifications on channels:

* `membership_change`
* `donation_change`
* `ticket_change`

The Phase‑2 Edge Functions (`stripe-webhook`, `email-receipt`) listen on
these channels via Supabase Realtime. See `Plan/PHASE2_PLAN.md`.
