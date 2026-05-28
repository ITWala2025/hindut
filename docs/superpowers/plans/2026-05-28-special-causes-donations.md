# Special Cause Donations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to create, publish, and manage "Special Cause" donation campaigns, each with a unique public donation page showing real-time progress, while the existing general donation workflow remains unchanged.

**Architecture:** A new `special_causes` table holds campaigns. Donations gain a nullable `cause_id` FK so every payment can be linked to a campaign. The public sees `/causes` (listing) and `/causes/:slug` (campaign page with `CauseDonationDialog`), which re-uses the existing Stripe checkout flow with an added `causeId` metadata field. Admins manage campaigns in a new `SpecialCausesSection` inside the existing admin portal.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Radix UI / shadcn-ui, Phosphor Icons, Supabase (PostgreSQL + RLS + RPC), Stripe Checkout (Netlify function), React Router v6.

---

## File Map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/20260528000071_special_causes.sql` |
| Create | `src/hooks/useSpecialCauses.ts` |
| Create | `src/components/CauseDonationDialog.tsx` |
| Create | `src/components/pages/CausesPage.tsx` |
| Create | `src/components/pages/CauseDetailPage.tsx` |
| Create | `src/components/admin/sections/SpecialCausesSection.tsx` |
| Modify | `src/lib/auth.tsx` — add `'causes'` module |
| Modify | `src/components/admin/AdminLayout.tsx` — add `'causes'` nav item |
| Modify | `src/components/pages/AdminPage.tsx` — wire section |
| Modify | `src/App.tsx` — add `/causes` and `/causes/:slug` routes |
| Modify | `netlify/functions/create-checkout-session.ts` — add `causeId` to `DonationSchema` |
| Modify | `netlify/functions/stripe-webhook.ts` — persist `cause_id` on donation rows |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260528000071_special_causes.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- =============================================================================
-- Migration: 20260528000071_special_causes.sql
-- Purpose : Special Cause donation campaigns with per-cause progress tracking.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- special_causes table
-- ---------------------------------------------------------------------------
create table if not exists public.special_causes (
  id                  uuid         primary key default uuid_generate_v4(),
  slug                text         not null unique,
  title               text         not null,
  description         text,
  cover_image_url     text,
  target_amount_eur   numeric(12,2),
  deadline            timestamptz,
  status              text         not null default 'draft'
                                   check (status in ('draft', 'active', 'paused', 'closed')),
  created_by          uuid         references auth.users(id) on delete set null,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

create index if not exists special_causes_status_idx on public.special_causes (status);
create index if not exists special_causes_slug_idx   on public.special_causes (slug);

drop trigger if exists special_causes_set_updated_at on public.special_causes;
create trigger special_causes_set_updated_at
  before update on public.special_causes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Add cause_id FK to donations
-- ---------------------------------------------------------------------------
alter table public.donations
  add column if not exists cause_id uuid references public.special_causes(id) on delete set null;

create index if not exists donations_cause_id_idx on public.donations (cause_id);

-- ---------------------------------------------------------------------------
-- RLS for special_causes
-- ---------------------------------------------------------------------------
alter table public.special_causes enable row level security;

drop policy if exists causes_public_read on public.special_causes;
create policy causes_public_read on public.special_causes
  for select
  using (status in ('active', 'paused', 'closed'));

drop policy if exists causes_admin_all on public.special_causes;
create policy causes_admin_all on public.special_causes
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists causes_editor_read on public.special_causes;
create policy causes_editor_read on public.special_causes
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- Admins can also see draft causes
drop policy if exists causes_admin_draft_read on public.special_causes;
create policy causes_admin_draft_read on public.special_causes
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- ---------------------------------------------------------------------------
-- RPC: total raised for one cause (callable by anon — returns aggregate only)
-- ---------------------------------------------------------------------------
create or replace function public.get_cause_total_raised(p_cause_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount_eur), 0)
  from donations
  where cause_id = p_cause_id and status = 'succeeded';
$$;

grant execute on function public.get_cause_total_raised(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: all causes with aggregated raised + donor count (admin / authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.get_causes_with_stats()
returns table (
  id                uuid,
  slug              text,
  title             text,
  description       text,
  cover_image_url   text,
  target_amount_eur numeric,
  deadline          timestamptz,
  status            text,
  created_at        timestamptz,
  updated_at        timestamptz,
  total_raised      numeric,
  donor_count       bigint
)
language sql
security definer
set search_path = public
as $$
  select
    sc.id,
    sc.slug,
    sc.title,
    sc.description,
    sc.cover_image_url,
    sc.target_amount_eur,
    sc.deadline,
    sc.status,
    sc.created_at,
    sc.updated_at,
    coalesce(sum(d.amount_eur) filter (where d.status = 'succeeded'), 0) as total_raised,
    count(distinct d.id) filter (where d.status = 'succeeded') as donor_count
  from public.special_causes sc
  left join public.donations d on d.cause_id = sc.id
  group by sc.id
  order by sc.created_at desc;
$$;

grant execute on function public.get_causes_with_stats() to authenticated;
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/prashant/Documents/Application\ directory/HinduT
npx supabase db push
```

Expected: No errors. If `set_updated_at` trigger function doesn't exist, check existing migrations — it is defined in `20260517000001_init_extensions_and_user_role.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260528000071_special_causes.sql
git commit -m "feat: add special_causes table, cause_id on donations, and progress RPCs"
```

---

## Task 2: `useSpecialCauses` Hook

**Files:**
- Create: `src/hooks/useSpecialCauses.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SpecialCauseRow {
  id: string
  slug: string
  title: string
  description: string | null
  cover_image_url: string | null
  target_amount_eur: number | null
  deadline: string | null
  status: 'draft' | 'active' | 'paused' | 'closed'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CauseWithStats extends SpecialCauseRow {
  total_raised: number
  donor_count: number
}

export interface NewSpecialCause {
  slug: string
  title: string
  description?: string
  cover_image_url?: string
  target_amount_eur?: number | null
  deadline?: string | null
  status: SpecialCauseRow['status']
}

/** Admin hook — reads all causes with aggregated stats. */
export function useSpecialCauses() {
  const [causes, setCauses] = useState<CauseWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCauses = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('get_causes_with_stats')
    if (err) setError(err.message)
    else setCauses((data ?? []) as CauseWithStats[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCauses() }, [fetchCauses])

  const createCause = useCallback(async (cause: NewSpecialCause) => {
    const { error: err } = await supabase.from('special_causes').insert({
      slug:               cause.slug,
      title:              cause.title,
      description:        cause.description        || null,
      cover_image_url:    cause.cover_image_url    || null,
      target_amount_eur:  cause.target_amount_eur  ?? null,
      deadline:           cause.deadline           ?? null,
      status:             cause.status,
    })
    if (err) throw new Error(err.message)
    await fetchCauses()
  }, [fetchCauses])

  const updateCause = useCallback(async (id: string, updates: Partial<NewSpecialCause>) => {
    const { error: err } = await supabase
      .from('special_causes')
      .update(updates)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetchCauses()
  }, [fetchCauses])

  const deleteCause = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('special_causes').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetchCauses()
  }, [fetchCauses])

  return { causes, loading, error, refetch: fetchCauses, createCause, updateCause, deleteCause }
}

/** Public hook — only active causes, no stats (used on /causes listing). */
export function usePublicCauses() {
  const [causes, setCauses] = useState<SpecialCauseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('special_causes')
      .select('id, slug, title, description, cover_image_url, target_amount_eur, deadline, status, created_at, updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCauses((data ?? []) as SpecialCauseRow[])
        setLoading(false)
      })
  }, [])

  return { causes, loading }
}

/** One-shot fetch for a single cause by slug (public, anon-safe). */
export async function fetchCauseBySlug(slug: string): Promise<SpecialCauseRow | null> {
  const { data } = await supabase
    .from('special_causes')
    .select('id, slug, title, description, cover_image_url, target_amount_eur, deadline, status, created_at, updated_at')
    .eq('slug', slug)
    .in('status', ['active', 'paused', 'closed'])
    .maybeSingle()
  return data as SpecialCauseRow | null
}

/** Call the anon-accessible RPC to get total raised for a cause. */
export async function fetchCauseTotalRaised(causeId: string): Promise<number> {
  const { data } = await supabase.rpc('get_cause_total_raised', { p_cause_id: causeId })
  return (data as number) ?? 0
}

/** Derive a URL-safe slug from a title. */
export function slugifyCause(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSpecialCauses.ts
git commit -m "feat: add useSpecialCauses hook with admin and public variants"
```

---

## Task 3: Add `'causes'` to RBAC

**Files:**
- Modify: `src/lib/auth.tsx`

- [ ] **Step 1: Add 'causes' to `AdminModule` union type (line ~46)**

Find:
```typescript
export type AdminModule =
  | 'analytics'
  | 'members'
  | 'receipts'
  | 'events'
  | 'rsvps'
  | 'tickets'
  | 'donations'
  | 'media'
  | 'services'
  | 'users'
  | 'settings'
```
Replace with:
```typescript
export type AdminModule =
  | 'analytics'
  | 'members'
  | 'receipts'
  | 'events'
  | 'rsvps'
  | 'tickets'
  | 'donations'
  | 'causes'
  | 'media'
  | 'services'
  | 'users'
  | 'settings'
```

- [ ] **Step 2: Add label to `MODULE_LABELS`**

Find:
```typescript
  donations: 'Donations',
  media:     'Media Library',
```
Replace with:
```typescript
  donations: 'Donations',
  causes:    'Special Causes',
  media:     'Media Library',
```

- [ ] **Step 3: Add to `ADMIN_MODULES` array**

Find:
```typescript
  'donations',
  'media',
```
Replace with:
```typescript
  'donations',
  'causes',
  'media',
```

- [ ] **Step 4: Add default permissions for admin and editor**

Find (inside `admin:` block):
```typescript
    donations: { view: true,  create: false, update: true,  delete: true  },
    media:     { view: true,  create: true,  update: true,  delete: true  },
```
Replace with:
```typescript
    donations: { view: true,  create: false, update: true,  delete: true  },
    causes:    { view: true,  create: true,  update: true,  delete: true  },
    media:     { view: true,  create: true,  update: true,  delete: true  },
```

Find (inside `editor:` block):
```typescript
    media:     { view: true,  create: true,  update: true,  delete: false },
```
Replace with:
```typescript
    causes:    { view: true,  create: false, update: false, delete: false },
    media:     { view: true,  create: true,  update: true,  delete: false },
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.tsx
git commit -m "feat: add 'causes' RBAC module to auth layer"
```

---

## Task 4: `CauseDonationDialog` Component

**Files:**
- Create: `src/components/CauseDonationDialog.tsx`

- [ ] **Step 1: Write the component**

This follows the exact same design as `DonationDialog.tsx` but accepts a cause and passes `causeId` to the checkout function.

```typescript
import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogPortal, DialogOverlay, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Heart, CheckCircle, CreditCard, ArrowLeft, Spinner, ShieldCheck, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { SpecialCauseRow } from '@/hooks/useSpecialCauses'

interface CauseDonationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cause: Pick<SpecialCauseRow, 'id' | 'title' | 'description'>
}

export function CauseDonationDialog({ open, onOpenChange, cause }: CauseDonationDialogProps) {
  const [step, setStep] = useState<'amount' | 'details' | 'payment' | 'success'>('amount')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const presetAmounts = [10, 25, 50, 100, 250, 500]
  const getDonationAmount = () => selectedAmount || parseFloat(customAmount) || 0

  const handleAmountNext = () => {
    if (!getDonationAmount() || getDonationAmount() <= 0) {
      toast.error('Please select or enter a valid donation amount')
      return
    }
    setStep('details')
  }

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!donorName || !donorEmail) {
      toast.error('Please provide your name and email')
      return
    }
    setStep('payment')
  }

  const handleStripePayment = async () => {
    const amount = getDonationAmount()
    if (amount <= 0) { toast.error('Invalid donation amount'); return }
    setIsProcessing(true)
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind:        'donation',
          amountEur:   amount,
          donorName,
          donorEmail,
          recurring,
          causeId:     cause.id,
          description: `Donation to: ${cause.title}`,
          successUrl:  `${window.location.origin}/causes/${cause.id}/success`,
          cancelUrl:   `${window.location.origin}/causes/${cause.id}?donation_cancelled=1`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'Could not start Stripe checkout. Please try again.')
        setIsProcessing(false)
        return
      }
      window.location.href = json.url
    } catch {
      toast.error('Network error. Please check your connection and try again.')
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('amount')
      setSelectedAmount(null)
      setCustomAmount('')
      setDonorName('')
      setDonorEmail('')
      setRecurring(false)
    }, 300)
  }

  const handleBack = () => {
    if (step === 'details') setStep('amount')
    if (step === 'payment') setStep('details')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-gradient-to-br from-orange-50 via-white to-amber-50',
            'overflow-y-auto focus:outline-none',
            'inset-0 rounded-none px-6 pb-8 pt-14',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=open]:slide-in-from-bottom-full',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=closed]:slide-out-to-bottom-full',
            'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'lg:inset-auto lg:top-1/2 lg:left-1/2',
            'lg:-translate-x-1/2 lg:-translate-y-1/2',
            'lg:w-full lg:max-w-[550px] lg:max-h-[90vh]',
            'lg:rounded-2xl lg:shadow-2xl',
            'lg:border lg:border-orange-200/40',
            'lg:px-6 lg:pb-6 lg:pt-6',
            'lg:data-[state=open]:slide-in-from-bottom-0 lg:data-[state=open]:zoom-in-95',
            'lg:data-[state=closed]:slide-out-to-bottom-0 lg:data-[state=closed]:zoom-out-95',
            'lg:duration-200',
          )}
        >
          <DialogPrimitive.Close
            className={cn(
              'absolute top-4 right-4 z-10 rounded-lg p-1.5',
              'text-orange-600 opacity-70 transition-opacity hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
              'disabled:pointer-events-none',
            )}
          >
            <X size={20} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* Amount Step */}
          {step === 'amount' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-3">
                    <Heart className="text-white" size={28} weight="fill" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                      {cause.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Choose your donation amount
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <Label className="text-sm font-semibold mb-3 block text-orange-800">Select Amount</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {presetAmounts.map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant={selectedAmount === amount ? 'default' : 'outline'}
                        className={cn(
                          'h-14 text-lg font-semibold transition-all hover:scale-105',
                          selectedAmount === amount
                            ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                            : 'border-orange-300 text-orange-700 hover:border-orange-500',
                        )}
                        onClick={() => { setSelectedAmount(amount); setCustomAmount('') }}
                      >
                        €{amount}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="cause-custom-amount" className="text-sm font-semibold mb-2 block text-orange-800">
                    Or Enter Custom Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 font-semibold">€</span>
                    <Input
                      id="cause-custom-amount"
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                      className="pl-7 border-orange-300 focus:border-orange-500"
                      min="1"
                      step="0.01"
                    />
                  </div>
                </div>
                <label
                  htmlFor="cause-recurring"
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                    recurring ? 'border-orange-500 bg-orange-50' : 'border-orange-200 bg-white hover:bg-orange-50/60',
                  )}
                >
                  <Checkbox
                    id="cause-recurring"
                    checked={recurring}
                    onCheckedChange={(v) => setRecurring(v === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-orange-800">Make this a monthly recurring donation</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      You will be charged €{getDonationAmount() || '—'} every month. Cancel any time.
                    </div>
                  </div>
                </label>
                <Button
                  onClick={handleAmountNext}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
                >
                  Continue to Payment
                </Button>
              </div>
            </>
          )}

          {/* Details Step */}
          {step === 'details' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="text-orange-700">
                    <ArrowLeft size={20} />
                  </Button>
                  <div>
                    <DialogTitle className="text-2xl text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                      Your Information
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Donation amount: €{getDonationAmount()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <form onSubmit={handleDetailsSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="cause-donor-name" className="text-sm font-semibold mb-2 block text-orange-800">
                    Your Name *
                  </Label>
                  <Input
                    id="cause-donor-name"
                    type="text"
                    placeholder="Enter your name"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="border-orange-300 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cause-donor-email" className="text-sm font-semibold mb-2 block text-orange-800">
                    Email Address *
                  </Label>
                  <Input
                    id="cause-donor-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    className="border-orange-300 focus:border-orange-500"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
                >
                  Continue to Payment
                </Button>
              </form>
            </>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="text-orange-700" disabled={isProcessing}>
                    <ArrowLeft size={20} />
                  </Button>
                  <div>
                    <DialogTitle className="text-2xl text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                      Complete Payment
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Donation: €{getDonationAmount()} · Stripe secure checkout
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="bg-white rounded-lg p-6 border-2 border-orange-200">
                  <p className="text-sm text-muted-foreground mb-4">
                    You will be redirected to Stripe's secure checkout to complete your €{getDonationAmount()}
                    {recurring ? ' monthly recurring' : ''} donation to <strong>{cause.title}</strong>.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="text-orange-600 mt-1" size={20} weight="fill" />
                      <div>
                        <p className="text-sm font-semibold text-orange-800">PCI-compliant payment</p>
                        <p className="text-xs text-muted-foreground">
                          Your card details are entered on Stripe's secure page — never on this site.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleStripePayment}
                    disabled={isProcessing}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
                  >
                    {isProcessing ? (
                      <><Spinner className="mr-2 animate-spin" size={20} />Redirecting to Stripe…</>
                    ) : (
                      <><CreditCard className="mr-2" size={20} />Continue to Stripe · €{getDonationAmount()}{recurring ? '/mo' : ''}</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Success Step (shown if user is redirected back without Stripe) */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-gradient-to-br from-orange-100 to-amber-100 p-6">
                  <CheckCircle className="text-orange-600" size={64} weight="fill" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold mb-2 text-orange-800" style={{ fontFamily: 'var(--font-heading)' }}>
                  Thank You for Your Generosity!
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-lg mb-2">
                  Donation: €{getDonationAmount()} to {cause.title}
                </DialogDescription>
                <p className="text-orange-700 mt-4 font-medium">May you be blessed with peace and prosperity. 🙏</p>
              </div>
              <Button onClick={handleClose} className="bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700">
                Close
              </Button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CauseDonationDialog.tsx
git commit -m "feat: add CauseDonationDialog for cause-specific donations"
```

---

## Task 5: `CauseDetailPage` Public Page

**Files:**
- Create: `src/components/pages/CauseDetailPage.tsx`

- [ ] **Step 1: Write the page**

```typescript
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, Calendar, Target, ShareNetwork, ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CauseDonationDialog } from '@/components/CauseDonationDialog'
import { fetchCauseBySlug, fetchCauseTotalRaised, type SpecialCauseRow } from '@/hooks/useSpecialCauses'
import { cn } from '@/lib/utils'

function ProgressBar({ raised, target }: { raised: number; target: number | null }) {
  if (!target) return null
  const percent = Math.min(100, Math.round((raised / target) * 100))
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-orange-800">
          €{raised.toLocaleString('en-IE', { minimumFractionDigits: 2 })} raised
        </span>
        <span className="text-muted-foreground">
          of €{target.toLocaleString('en-IE', { minimumFractionDigits: 2 })} goal
        </span>
      </div>
      <div className="h-3 rounded-full bg-orange-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">{percent}% of goal reached</div>
    </div>
  )
}

function StatusBadge({ status }: { status: SpecialCauseRow['status'] }) {
  const map = {
    active: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Active' },
    paused: { cls: 'bg-amber-100 text-amber-800 border-amber-200',   label: 'Paused'  },
    closed: { cls: 'bg-slate-100 text-slate-700 border-slate-200',   label: 'Closed'  },
    draft:  { cls: 'bg-slate-100 text-slate-700 border-slate-200',   label: 'Draft'   },
  }
  const { cls, label } = map[status] ?? map.draft
  return <Badge className={cn('border', cls)}>{label}</Badge>
}

export function CauseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [cause, setCause] = useState<SpecialCauseRow | null>(null)
  const [totalRaised, setTotalRaised] = useState(0)
  const [loading, setLoading] = useState(true)
  const [donateOpen, setDonateOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([
      fetchCauseBySlug(slug),
    ]).then(([c]) => {
      setCause(c)
      if (c) fetchCauseTotalRaised(c.id).then(setTotalRaised)
      setLoading(false)
    })
  }, [slug])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    )
  }

  if (!cause) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Campaign not found</h1>
        <p className="text-muted-foreground mb-6">This donation campaign may have ended or the link is incorrect.</p>
        <Link to="/causes">
          <Button variant="outline" className="border-orange-300 text-orange-700">
            <ArrowLeft size={16} className="mr-2" /> View all campaigns
          </Button>
        </Link>
      </div>
    )
  }

  const isClosed = cause.status === 'closed'
  const isPaused = cause.status === 'paused'
  const canDonate = cause.status === 'active'

  const deadlineDate = cause.deadline ? new Date(cause.deadline) : null
  const isExpired    = deadlineDate ? deadlineDate < new Date() : false

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-white">
      {/* Hero */}
      <div className="relative">
        {cause.cover_image_url ? (
          <div className="h-64 md:h-80 overflow-hidden">
            <img
              src={cause.cover_image_url}
              alt={cause.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Heart size={64} className="text-white/30" weight="fill" />
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link to="/causes" className="inline-flex items-center gap-1.5 text-sm text-orange-700 hover:text-orange-900 hover:underline">
          <ArrowLeft size={15} /> All campaigns
        </Link>

        {/* Title & status */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold text-orange-900" style={{ fontFamily: 'var(--font-heading)' }}>
              {cause.title}
            </h1>
            <StatusBadge status={cause.status} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {deadlineDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={15} className="text-orange-500" />
                {isExpired ? 'Ended ' : 'Deadline: '}
                {deadlineDate.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {cause.target_amount_eur && (
              <span className="flex items-center gap-1.5">
                <Target size={15} className="text-orange-500" />
                Target: €{cause.target_amount_eur.toLocaleString('en-IE')}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-orange-100 p-6 shadow-sm">
          <ProgressBar raised={totalRaised} target={cause.target_amount_eur} />
          {!cause.target_amount_eur && (
            <div className="text-orange-800 font-semibold">
              €{totalRaised.toLocaleString('en-IE', { minimumFractionDigits: 2 })} raised so far
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {canDonate && !isExpired ? (
              <Button
                onClick={() => setDonateOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold px-6 h-11"
              >
                <Heart size={18} className="mr-2" weight="fill" />
                Donate to this Cause
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
                {isClosed || isExpired ? (
                  <><CheckCircle size={16} className="text-emerald-600" /> This campaign has closed</>
                ) : (
                  <><span className="h-2 w-2 rounded-full bg-amber-400" /> Donations temporarily paused</>
                )}
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-orange-300 text-orange-700 hover:bg-orange-50 h-11"
            >
              {copied ? (
                <><CheckCircle size={16} className="mr-1.5 text-emerald-600" />Copied!</>
              ) : (
                <><ShareNetwork size={16} className="mr-1.5" />Share</>
              )}
            </Button>
          </div>
        </div>

        {/* Description */}
        {cause.description && (
          <div className="prose prose-orange max-w-none">
            <h2 className="text-xl font-bold text-orange-900" style={{ fontFamily: 'var(--font-heading)' }}>
              About this cause
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{cause.description}</p>
          </div>
        )}
      </div>

      {/* Donation dialog */}
      {canDonate && (
        <CauseDonationDialog
          open={donateOpen}
          onOpenChange={setDonateOpen}
          cause={{ id: cause.id, title: cause.title, description: cause.description }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pages/CauseDetailPage.tsx
git commit -m "feat: add CauseDetailPage with progress bar, share button, and donate dialog"
```

---

## Task 6: `CausesPage` Public Listing

**Files:**
- Create: `src/components/pages/CausesPage.tsx`

- [ ] **Step 1: Write the page**

```typescript
import { Link } from 'react-router-dom'
import { Heart, ArrowRight, Target } from '@phosphor-icons/react'
import { usePublicCauses, type SpecialCauseRow } from '@/hooks/useSpecialCauses'

function CauseCard({ cause }: { cause: SpecialCauseRow }) {
  const deadlineDate = cause.deadline ? new Date(cause.deadline) : null
  const isExpired    = deadlineDate ? deadlineDate < new Date() : false

  return (
    <Link
      to={`/causes/${cause.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md hover:border-orange-300 transition-all overflow-hidden"
    >
      {cause.cover_image_url ? (
        <div className="h-48 overflow-hidden">
          <img
            src={cause.cover_image_url}
            alt={cause.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
          <Heart size={48} className="text-white/40" weight="fill" />
        </div>
      )}

      <div className="flex-1 p-5 space-y-3">
        <h2 className="font-bold text-lg text-orange-900 group-hover:text-orange-700 leading-snug line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {cause.title}
        </h2>

        {cause.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {cause.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
          {cause.target_amount_eur && (
            <span className="flex items-center gap-1">
              <Target size={12} className="text-orange-400" />
              Target: €{cause.target_amount_eur.toLocaleString('en-IE')}
            </span>
          )}
          {deadlineDate && !isExpired && (
            <span>
              Deadline: {deadlineDate.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-orange-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-orange-700 group-hover:text-orange-900 transition-colors">
          Learn more &amp; Donate
        </span>
        <ArrowRight size={16} className="text-orange-500 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}

export function CausesPage() {
  const { causes, loading } = usePublicCauses()

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 to-white">
      {/* Page header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-white/20 p-4">
              <Heart size={40} weight="fill" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Special Cause Campaigns
          </h1>
          <p className="text-orange-100 text-lg max-w-xl mx-auto">
            Support dedicated campaigns that make a direct impact for our community and temple.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          </div>
        ) : causes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart size={40} className="mx-auto mb-3 text-orange-200" weight="fill" />
            <p className="font-semibold text-slate-700">No active campaigns at the moment.</p>
            <p className="text-sm mt-1">Check back soon — new causes will be published here.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {causes.map((c) => <CauseCard key={c.id} cause={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pages/CausesPage.tsx
git commit -m "feat: add CausesPage public listing of active campaigns"
```

---

## Task 7: Update `App.tsx` Routes

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add CausesPage and CauseDetailPage imports**

Add these to the existing lazy import block (around line 15):

```typescript
const CausesPage      = lazy(() => import('@/components/pages/CausesPage').then(m => ({ default: m.CausesPage })))
const CauseDetailPage = lazy(() => import('@/components/pages/CauseDetailPage').then(m => ({ default: m.CauseDetailPage })))
```

- [ ] **Step 2: Add routes inside the public AppShell Routes**

Find the existing events routes:
```typescript
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<Suspense fallback={<PageLoader />}><EventDetailPage /></Suspense>} />
```

Add after them:
```typescript
          <Route path="/causes" element={<Suspense fallback={<PageLoader />}><CausesPage /></Suspense>} />
          <Route path="/causes/:slug" element={<Suspense fallback={<PageLoader />}><CauseDetailPage /></Suspense>} />
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /causes and /causes/:slug public routes"
```

---

## Task 8: `SpecialCausesSection` Admin Section

**Files:**
- Create: `src/components/admin/sections/SpecialCausesSection.tsx`

- [ ] **Step 1: Write the section**

```typescript
import { useState, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash,
  MagnifyingGlass,
  Heart,
  Image as ImageIcon,
  X,
  Check,
  Target,
  CalendarBlank,
  ArrowsClockwise,
  ArrowSquareOut,
  Pause,
  Play,
  XCircle,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useSpecialCauses, slugifyCause, type CauseWithStats, type NewSpecialCause } from '@/hooks/useSpecialCauses'
import { useAuth } from '@/lib/auth'
import { useMedia } from '@/hooks/useMedia'
import { KpiCard, SectionCard, DataTable, Th, Td, EmptyState } from '@/components/admin/adminUi'
import { cn } from '@/lib/utils'
import type { MediaItem } from '@/lib/types'
import { Link } from 'react-router-dom'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: CauseWithStats['status'] }) {
  const map: Record<CauseWithStats['status'], { cls: string; label: string }> = {
    draft:  { cls: 'bg-slate-100 text-slate-700',       label: 'Draft'  },
    active: { cls: 'bg-emerald-100 text-emerald-800',   label: 'Active' },
    paused: { cls: 'bg-amber-100 text-amber-800',       label: 'Paused' },
    closed: { cls: 'bg-red-100 text-red-700',           label: 'Closed' },
  }
  const { cls, label } = map[status]
  return <Badge className={cls}>{label}</Badge>
}

function ProgressBar({ raised, target }: { raised: number; target: number | null }) {
  if (!target) return <span className="text-xs text-muted-foreground">No target set</span>
  const pct = Math.min(100, Math.round((raised / target) * 100))
  return (
    <div className="w-full space-y-1">
      <div className="h-2 rounded-full bg-orange-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">{pct}% of €{target.toLocaleString('en-IE')}</div>
    </div>
  )
}

const EMPTY_FORM: NewSpecialCause = {
  slug:              '',
  title:             '',
  description:       '',
  cover_image_url:   '',
  target_amount_eur: null,
  deadline:          null,
  status:            'draft',
}

export function SpecialCausesSection() {
  const { can } = useAuth()
  const canCreate = can('causes:create')
  const canUpdate = can('causes:update')
  const canDelete = can('causes:delete')

  const { causes, loading, error, refetch, createCause, updateCause, deleteCause } = useSpecialCauses()
  const { media } = useMedia()

  const [search, setSearch]         = useState('')
  const [formOpen, setFormOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState<CauseWithStats | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CauseWithStats | null>(null)
  const [form, setForm]             = useState<NewSpecialCause>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [imageSearch, setImageSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return causes
    const q = search.toLowerCase()
    return causes.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q),
    )
  }, [causes, search])

  const activeCauses  = causes.filter((c) => c.status === 'active').length
  const totalRaised   = causes.reduce((s, c) => s + (c.total_raised ?? 0), 0)
  const totalDonors   = causes.reduce((s, c) => s + Number(c.donor_count ?? 0), 0)

  const imagePickerImages = useMemo(() => {
    const q = imageSearch.toLowerCase()
    return (media as MediaItem[]).filter((m) =>
      m.content_type?.startsWith('image/') &&
      (m.name?.toLowerCase().includes(q) || !q),
    )
  }, [media, imageSearch])

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(c: CauseWithStats) {
    setEditTarget(c)
    setForm({
      slug:              c.slug,
      title:             c.title,
      description:       c.description ?? '',
      cover_image_url:   c.cover_image_url ?? '',
      target_amount_eur: c.target_amount_eur ?? null,
      deadline:          c.deadline ? c.deadline.slice(0, 10) : null,
      status:            c.status,
    })
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.slug.trim())  { toast.error('Slug is required.');  return }
    setSaving(true)
    try {
      if (editTarget) {
        await updateCause(editTarget.id, {
          ...form,
          description:       form.description       || undefined,
          cover_image_url:   form.cover_image_url   || undefined,
          target_amount_eur: form.target_amount_eur ?? null,
          deadline:          form.deadline           ? new Date(form.deadline).toISOString() : null,
        })
        toast.success('Campaign updated.')
      } else {
        await createCause({
          ...form,
          description:       form.description       || undefined,
          cover_image_url:   form.cover_image_url   || undefined,
          target_amount_eur: form.target_amount_eur ?? null,
          deadline:          form.deadline           ? new Date(form.deadline).toISOString() : null,
        })
        toast.success('Campaign created.')
      }
      setFormOpen(false)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to save campaign.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteCause(deleteTarget.id)
      toast.success('Campaign deleted.')
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete campaign.')
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleQuickStatus(c: CauseWithStats, status: CauseWithStats['status']) {
    try {
      await updateCause(c.id, { status })
      toast.success(`Campaign ${status === 'active' ? 'published' : status === 'paused' ? 'paused' : 'closed'}.`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to update status.')
    }
  }

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Active Campaigns"
          value={String(activeCauses)}
          icon={<Heart size={22} weight="duotone" />}
          accent="orange"
        />
        <KpiCard
          label="Total Raised"
          value={`€${totalRaised.toLocaleString('en-IE', { minimumFractionDigits: 2 })}`}
          icon={<Target size={22} weight="duotone" />}
          accent="green"
        />
        <KpiCard
          label="Total Donors"
          value={String(totalDonors)}
          icon={<Heart size={22} weight="duotone" />}
          accent="amber"
        />
      </div>

      {/* Main section */}
      <SectionCard
        title="Special Cause Campaigns"
        description="Create, manage, and publish dedicated donation campaigns with real-time progress tracking."
        actions={
          <>
            {canCreate && (
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700 font-semibold"
              >
                <Plus size={15} className="mr-1.5" />
                New Campaign
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <ArrowsClockwise size={15} className="mr-1.5" />
              Refresh
            </Button>
          </>
        }
      >
        {/* Search */}
        <div className="relative mb-5 max-w-sm">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2">{error}</p>
        )}

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading campaigns…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Heart size={32} className="text-orange-300" weight="fill" />}
            title="No campaigns yet"
            description="Create your first special cause campaign to start collecting targeted donations."
            action={canCreate ? (
              <Button onClick={openCreate} className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                <Plus size={15} className="mr-1.5" /> New Campaign
              </Button>
            ) : undefined}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Status</Th>
                <Th>Progress</Th>
                <Th>Raised</Th>
                <Th>Donors</Th>
                <Th>Deadline</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <Td>
                    <div className="flex items-center gap-3">
                      {c.cover_image_url ? (
                        <img src={c.cover_image_url} alt="" className="h-10 w-16 rounded object-cover border border-slate-200 shrink-0" />
                      ) : (
                        <div className="h-10 w-16 rounded bg-orange-100 flex items-center justify-center shrink-0">
                          <Heart size={16} className="text-orange-400" weight="fill" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 line-clamp-1">{c.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">/causes/{c.slug}</div>
                      </div>
                    </div>
                  </Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td><ProgressBar raised={c.total_raised ?? 0} target={c.target_amount_eur} /></Td>
                  <Td>
                    <span className="font-bold text-slate-900">
                      €{(c.total_raised ?? 0).toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm">{String(c.donor_count ?? 0)}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {c.deadline ? formatDate(c.deadline) : '—'}
                    </span>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {/* Public link */}
                    {c.status !== 'draft' && (
                      <Link to={`/causes/${c.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" title="View public page">
                          <ArrowSquareOut size={15} />
                        </Button>
                      </Link>
                    )}
                    {/* Quick status actions */}
                    {canUpdate && c.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickStatus(c, 'active')}
                        className="text-emerald-600 hover:bg-emerald-50"
                        title="Publish"
                      >
                        <Play size={15} />
                      </Button>
                    )}
                    {canUpdate && c.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickStatus(c, 'paused')}
                        className="text-amber-600 hover:bg-amber-50"
                        title="Pause"
                      >
                        <Pause size={15} />
                      </Button>
                    )}
                    {canUpdate && c.status === 'paused' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickStatus(c, 'active')}
                          className="text-emerald-600 hover:bg-emerald-50"
                          title="Resume"
                        >
                          <Play size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickStatus(c, 'closed')}
                          className="text-red-500 hover:bg-red-50"
                          title="Close campaign"
                        >
                          <XCircle size={15} />
                        </Button>
                      </>
                    )}
                    {canUpdate && c.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickStatus(c, 'closed')}
                        className="text-red-500 hover:bg-red-50"
                        title="Close campaign"
                      >
                        <XCircle size={15} />
                      </Button>
                    )}
                    {/* Edit */}
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="text-slate-600 hover:text-slate-900"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </Button>
                    )}
                    {/* Delete */}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(c)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash size={15} />
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </SectionCard>

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditTarget(null); setForm(EMPTY_FORM) } }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Campaign' : 'New Special Cause Campaign'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update the campaign details.' : 'Create a dedicated donation campaign with its own public page.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label htmlFor="cause-title" className="mb-1.5 block">Title *</Label>
              <Input
                id="cause-title"
                placeholder="e.g. Diwali Lamp Fund 2026"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: editTarget ? f.slug : slugifyCause(title),
                  }))
                }}
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="cause-slug" className="mb-1.5 block">
                URL Slug * <span className="text-xs text-muted-foreground font-normal">(auto-generated, editable)</span>
              </Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0">/causes/</span>
                <Input
                  id="cause-slug"
                  placeholder="diwali-lamp-fund-2026"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="cause-desc" className="mb-1.5 block">Description</Label>
              <Textarea
                id="cause-desc"
                placeholder="Describe what this campaign is for and how donations will be used…"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Cover image */}
            <div>
              <Label className="mb-1.5 block">Cover Image</Label>
              {form.cover_image_url ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-slate-200">
                  <img src={form.cover_image_url} alt="cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, cover_image_url: '' }))}
                    className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setImagePickerOpen(true)}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/40 flex flex-col items-center justify-center gap-1.5 text-orange-600 hover:text-orange-800 transition-colors"
                >
                  <ImageIcon size={22} />
                  <span className="text-xs">Click to select from media library</span>
                </button>
              )}
            </div>

            {/* Target + Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cause-target" className="mb-1.5 block">
                  Target Amount (€)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  <Input
                    id="cause-target"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Optional"
                    className="pl-6"
                    value={form.target_amount_eur ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, target_amount_eur: e.target.value ? parseFloat(e.target.value) : null }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cause-deadline" className="mb-1.5 block">Deadline</Label>
                <Input
                  id="cause-deadline"
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value || null }))}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="cause-status" className="mb-1.5 block">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as NewSpecialCause['status'] }))}
              >
                <SelectTrigger id="cause-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (hidden from public)</SelectItem>
                  <SelectItem value="active">Active (publicly visible + donations open)</SelectItem>
                  <SelectItem value="paused">Paused (visible but donations closed)</SelectItem>
                  <SelectItem value="closed">Closed (visible, campaign ended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setFormOpen(false); setEditTarget(null); setForm(EMPTY_FORM) }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Picker Dialog */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Cover Image</DialogTitle>
            <DialogDescription>Choose an image from your media library.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search images…"
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto">
            {imagePickerImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, cover_image_url: img.public_url ?? '' }))
                  setImagePickerOpen(false)
                  setImageSearch('')
                }}
                className={cn(
                  'relative rounded-lg overflow-hidden aspect-video border-2 border-transparent hover:border-orange-500 transition-colors',
                  form.cover_image_url === img.public_url && 'border-orange-500',
                )}
              >
                <img src={img.public_url ?? ''} alt={img.name ?? ''} className="w-full h-full object-cover" />
                {form.cover_image_url === img.public_url && (
                  <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                    <Check size={22} className="text-white" weight="bold" />
                  </div>
                )}
              </button>
            ))}
            {imagePickerImages.length === 0 && (
              <p className="col-span-3 text-center text-sm text-muted-foreground py-6">No images found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> will be permanently deleted. Donation records linked to this campaign will
              have their cause reference removed but will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/sections/SpecialCausesSection.tsx
git commit -m "feat: add SpecialCausesSection admin panel with create/edit/status controls"
```

---

## Task 9: Wire Up Admin Layout and Page

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`
- Modify: `src/components/pages/AdminPage.tsx`

### AdminLayout.tsx

- [ ] **Step 1: Add `'causes'` to `AdminSectionId` union**

Find:
```typescript
export type AdminSectionId =
  | 'dashboard'
  | 'analytics'
  | 'membership'
  | 'receipts'
  | 'events'
  | 'rsvps'
  | 'tickets'
  | 'donations'
  | 'media'
  | 'services'
  | 'users'
  | 'roles'
  | 'settings'
```
Replace with:
```typescript
export type AdminSectionId =
  | 'dashboard'
  | 'analytics'
  | 'membership'
  | 'receipts'
  | 'events'
  | 'rsvps'
  | 'tickets'
  | 'donations'
  | 'causes'
  | 'media'
  | 'services'
  | 'users'
  | 'roles'
  | 'settings'
```

- [ ] **Step 2: Add nav item for causes**

Add this import at the top with the other icon imports:
```typescript
import { Sparkle as CauseIcon } from '@phosphor-icons/react'
```

(Re-use `Sparkle` or use another available Phosphor icon. Actually use `Heart` which is already available from `@phosphor-icons/react` — add it to the existing destructured import.)

Find the existing import line with `HandCoins`:
```typescript
  HandCoins,
  Lock,
} from '@phosphor-icons/react'
```
Replace with:
```typescript
  HandCoins,
  Heart,
  Lock,
} from '@phosphor-icons/react'
```

- [ ] **Step 3: Add the nav item to `NAV_ITEMS` array**

Find:
```typescript
  {
    id: 'donations',
    label: 'Donations',
    icon: <HandCoins size={20} weight="duotone" />,
    capability: 'donations:view',
  },
```
Add after it:
```typescript
  {
    id: 'causes',
    label: 'Special Causes',
    icon: <Heart size={20} weight="duotone" />,
    capability: 'causes:view',
  },
```

### AdminPage.tsx

- [ ] **Step 4: Import `SpecialCausesSection`**

Add to the existing import block:
```typescript
import { SpecialCausesSection } from '@/components/admin/sections/SpecialCausesSection'
```

- [ ] **Step 5: Add `causes` to `SECTION_VIEW_CAPABILITY` map**

Find:
```typescript
  donations:  'donations:view',
  media:      'media:view',
```
Replace with:
```typescript
  donations:  'donations:view',
  causes:     'causes:view',
  media:      'media:view',
```

- [ ] **Step 6: Add case to `renderSection` switch**

Find:
```typescript
    case 'donations':
      return <DonationsSection />
    case 'media':
```
Replace with:
```typescript
    case 'donations':
      return <DonationsSection />
    case 'causes':
      return <SpecialCausesSection />
    case 'media':
```

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/AdminLayout.tsx src/components/pages/AdminPage.tsx
git commit -m "feat: wire SpecialCausesSection into admin nav and routing"
```

---

## Task 10: Extend `create-checkout-session.ts`

**Files:**
- Modify: `netlify/functions/create-checkout-session.ts`

- [ ] **Step 1: Add `causeId` to `DonationSchema`**

Find:
```typescript
const DonationSchema = z.object({
  kind:        z.literal('donation'),
  amountEur:   z.number().min(1).max(50000),
  donorName:   z.string().min(1).max(120),
  donorEmail:  z.string().email().max(254),
  recurring:   z.boolean().optional().default(false),
  description: z.string().max(500).optional(),
  successUrl:  z.string().url().optional(),
  cancelUrl:   z.string().url().optional(),
})
```
Replace with:
```typescript
const DonationSchema = z.object({
  kind:        z.literal('donation'),
  amountEur:   z.number().min(1).max(50000),
  donorName:   z.string().min(1).max(120),
  donorEmail:  z.string().email().max(254),
  recurring:   z.boolean().optional().default(false),
  description: z.string().max(500).optional(),
  causeId:     z.string().uuid().optional(),
  successUrl:  z.string().url().optional(),
  cancelUrl:   z.string().url().optional(),
})
```

- [ ] **Step 2: Persist `causeId` in the pre-created pending donation row**

Find (inside the `kind === 'donation'` block, the one-time donation insert):
```typescript
        const { data: donationRow, error: insertErr } = await supabase
          .from('donations')
          .insert({
            donor_name:  d.donorName,
            donor_email: d.donorEmail,
            gateway:     'stripe',
            amount_eur:  d.amountEur,
            currency:    'EUR',
            recurring:   false,
            status:      'pending',
            description: d.description ?? 'One-time donation',
          })
```
Replace with:
```typescript
        const { data: donationRow, error: insertErr } = await supabase
          .from('donations')
          .insert({
            donor_name:  d.donorName,
            donor_email: d.donorEmail,
            gateway:     'stripe',
            amount_eur:  d.amountEur,
            currency:    'EUR',
            recurring:   false,
            status:      'pending',
            description: d.description ?? 'One-time donation',
            ...(d.causeId ? { cause_id: d.causeId } : {}),
          })
```

- [ ] **Step 3: Forward `causeId` in session metadata**

Find (the session metadata object for donation):
```typescript
        metadata: {
          kind:        'donation',
          ...(donationId ? { donationId } : {}),
          donorName:   d.donorName,
          donorEmail:  d.donorEmail,
          recurring:   String(d.recurring),
        },
```
Replace with:
```typescript
        metadata: {
          kind:        'donation',
          ...(donationId ? { donationId } : {}),
          donorName:   d.donorName,
          donorEmail:  d.donorEmail,
          recurring:   String(d.recurring),
          ...(d.causeId ? { causeId: d.causeId } : {}),
        },
```

- [ ] **Step 4: Also forward `causeId` in recurring donation subscription metadata**

Find (the `subscription_data.metadata` inside the recurring path):
```typescript
              subscription_data: {
                metadata: {
                  kind:      'donation',
                  donorName: d.donorName,
                  donorEmail: d.donorEmail,
                  amountEur:  String(d.amountEur),
                },
              },
```
Replace with:
```typescript
              subscription_data: {
                metadata: {
                  kind:       'donation',
                  donorName:  d.donorName,
                  donorEmail: d.donorEmail,
                  amountEur:  String(d.amountEur),
                  ...(d.causeId ? { causeId: d.causeId } : {}),
                },
              },
```

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/create-checkout-session.ts
git commit -m "feat: forward causeId through Stripe checkout session metadata"
```

---

## Task 11: Extend `stripe-webhook.ts` to Persist `cause_id`

**Files:**
- Modify: `netlify/functions/stripe-webhook.ts`

- [ ] **Step 1: Update one-time donation success handler to write `cause_id`**

Find (the `checkout.session.completed` one-time donation update):
```typescript
            await supabase
              .from('donations')
              .update({
                status:                   'succeeded',
                stripe_payment_intent_id: paymentIntentId,
                updated_at:               new Date().toISOString(),
              })
              .eq('id', donationId)
            console.log('[stripe-webhook] one-time donation', donationId, '→ succeeded')
```
Replace with:
```typescript
            const onetimeCauseId = session.metadata?.causeId ?? null
            await supabase
              .from('donations')
              .update({
                status:                   'succeeded',
                stripe_payment_intent_id: paymentIntentId,
                updated_at:               new Date().toISOString(),
                ...(onetimeCauseId ? { cause_id: onetimeCauseId } : {}),
              })
              .eq('id', donationId)
            console.log('[stripe-webhook] one-time donation', donationId, '→ succeeded', onetimeCauseId ? `cause ${onetimeCauseId}` : '')
```

- [ ] **Step 2: Update recurring donation row creation to include `cause_id`**

Find (the `checkout.session.completed` recurring donation insert):
```typescript
            const { data: newDon, error: donErr } = await supabase
              .from('donations')
              .insert({
                donor_name:             donorName,
                donor_email:            donorEmail,
                gateway:                'stripe',
                amount_eur:             amountEur,
                currency:               'EUR',
                recurring:              true,
                status:                 'succeeded',
                description:            'Recurring donation',
                stripe_subscription_id: subscriptionId,
              })
```
Replace with:
```typescript
            const recurringCauseId = session.metadata?.causeId ?? null
            const { data: newDon, error: donErr } = await supabase
              .from('donations')
              .insert({
                donor_name:             donorName,
                donor_email:            donorEmail,
                gateway:                'stripe',
                amount_eur:             amountEur,
                currency:               'EUR',
                recurring:              true,
                status:                 'succeeded',
                description:            'Recurring donation',
                stripe_subscription_id: subscriptionId,
                ...(recurringCauseId ? { cause_id: recurringCauseId } : {}),
              })
```

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/stripe-webhook.ts
git commit -m "feat: persist cause_id on donation rows from webhook events"
```

---

## Task 12: Verify End-to-End

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify public listing page**

Navigate to `http://localhost:5173/causes`.
Expected: Page renders with header "Special Cause Campaigns" and empty state message (no active causes yet).

- [ ] **Step 3: Create a campaign in admin**

Navigate to `http://localhost:5173/admin/causes`.
Expected: "Special Causes" appears in the sidebar. KPI row shows zeros. Empty state with "New Campaign" button.

Click "New Campaign", fill in:
- Title: `Test Lamp Fund`
- Description: `A test cause for lamps`
- Target: `1000`
- Status: `Active`

Click "Create Campaign". Expected: toast "Campaign created." and row appears in the table.

- [ ] **Step 4: Verify public detail page**

Navigate to `http://localhost:5173/causes/test-lamp-fund`.
Expected:
- Title and description visible
- Progress bar shows €0.00 of €1,000 goal (0%)
- "Donate to this Cause" button is present
- Share button copies URL to clipboard

- [ ] **Step 5: Verify the listing page now shows the card**

Navigate to `http://localhost:5173/causes`.
Expected: One card with "Test Lamp Fund" title, description excerpt, and "Learn more & Donate" link.

- [ ] **Step 6: Verify the Donate button opens CauseDonationDialog**

Click "Donate to this Cause". Expected: Dialog opens with cause title in header, orange/amber color scheme matching the general donation dialog.

- [ ] **Step 7: Check TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 8: Test status transitions in admin**

In admin causes table:
- Click Publish (▶) on a draft cause → status changes to Active, toast appears
- Click Pause (⏸) on an active cause → status changes to Paused
- Click ▶ on paused cause → resumes to Active
- Click ✕ on active cause → closes campaign

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: verify special causes end-to-end workflow complete"
```

---

## Post-Implementation Notes

**Audit log:** Every donation linked to a cause is already recorded in the `donations` table with `cause_id`. Admins can filter the existing DonationsSection by viewing the cause campaign detail and cross-referencing donor email / date. A future enhancement could add a "View Donations" drilldown in SpecialCausesSection.

**Shareable URL:** The public cause page URL is `https://yoursite.com/causes/<slug>`. Admins should copy this from the `/admin/causes` row's public-link button after publishing.

**Existing donation workflow:** The general `DonationDialog` and all existing `/donation-success` flows are completely untouched. Special cause donations land in the same `donations` table with an extra `cause_id` FK, so they appear in DonationsSection with `cause_id` set. The existing CSV export and receipt generation work without modification.
