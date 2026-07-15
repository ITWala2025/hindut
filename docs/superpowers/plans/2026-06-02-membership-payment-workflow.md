# Membership Payment Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the silent monthly subscription creation failure in Stripe, make monthly contributions visible to customers post-checkout, add a 3-day reminder email before each monthly charge, and surface a per-member payment timeline in the admin panel.

**Architecture:** All payment processing goes through Netlify Functions + Stripe webhooks; the database (Supabase) is the authoritative store for membership and donation records; the admin timeline is derived purely from DB fields (no live Stripe calls from the UI). The reminder email is triggered by Stripe's own `invoice.upcoming` webhook event — no separate scheduler needed.

**Tech Stack:** TypeScript, Netlify Functions, Stripe SDK (`stripe`), Supabase (postgres via `@supabase/supabase-js`), Nodemailer, React, Tailwind CSS, shadcn/ui, Phosphor icons.

---

## File Map

| File | Change |
|------|--------|
| `netlify/functions/stripe-webhook.ts` | Fix monthly sub creation (pass `default_payment_method`); fix `addedMonthly` hardcode; add `invoice.upcoming` handler |
| `netlify/functions/lib/monthlyReminderEmailTemplate.ts` | **Create** — HAI-branded 3-day reminder email (HTML + text) |
| `netlify/functions/create-checkout-session.ts` | Embed `monthly_eur` in membership success URL |
| `src/components/pages/PaymentSuccessPage.tsx` | Show monthly contribution card in membership variant |
| `src/hooks/useMembership.ts` | Add `useMemberPaymentHistory` hook function |
| `src/components/admin/sections/MembersSection.tsx` | Replace existing monthly-contribution band with full `PaymentTimeline` component |

---

## Task 1: Fix Monthly Subscription Creation in Stripe Webhook

**Problem:** `stripe.subscriptions.create()` silently fails because the customer has no `default_payment_method` explicitly set on the new subscription. Stripe requires this for off-session charges after the trial ends. The error is caught and swallowed, leaving `monthly_stripe_sub_id = null`.

**Files:**
- Modify: `netlify/functions/stripe-webhook.ts` — the `checkout.session.completed / kind === 'membership'` branch

- [ ] **Step 1: Locate the monthly contribution setup block**

Open `netlify/functions/stripe-webhook.ts`. Find the comment `// ── Set up optional monthly contribution subscription`. The block starts with:
```typescript
if (monthlyContributionEur >= 1 && customerId) {
```
This is roughly line 230 in the current file.

- [ ] **Step 2: Replace the subscriptions.create call with the fixed version**

Replace everything inside that `if` block (from `const now = new Date()` through the closing `}` of the outer `if`) with the following. This adds default payment method resolution and surfaces the error properly:

```typescript
if (monthlyContributionEur >= 1 && customerId) {
  // trial_end = first second of the first day of next month (UTC)
  const now = new Date()
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  // Persist receipt metadata before attempting Stripe setup so it is
  // visible even if the subscription creation fails.
  const { error: receiptMetaErr } = await supabase
    .from('receipts')
    .update({
      metadata: {
        monthly_contribution_eur: monthlyContributionEur,
        monthly_start_date:       nextMonthStart.toISOString(),
      },
    })
    .eq('type', 'membership')
    .eq('related_id', membershipId)
  if (receiptMetaErr) {
    console.error('[stripe-webhook] receipt metadata update error:', receiptMetaErr.message)
  }

  try {
    const trialEnd = Math.floor(nextMonthStart.getTime() / 1000)

    // Stripe requires a default_payment_method on new subscriptions so it
    // can charge the customer when the trial ends. The annual checkout sets
    // this on the subscription; retrieve it and forward it here.
    let defaultPaymentMethodId: string | null = null
    if (subscriptionId) {
      try {
        const annualSub = await stripe.subscriptions.retrieve(subscriptionId)
        const dpm = annualSub.default_payment_method
        defaultPaymentMethodId = typeof dpm === 'string' ? dpm : (dpm as Stripe.PaymentMethod | null)?.id ?? null
      } catch (pmErr) {
        console.warn('[stripe-webhook] could not retrieve annual sub for PM:', (pmErr as Error).message)
      }
    }

    // Fall back to customer invoice default if sub had none.
    if (!defaultPaymentMethodId) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const cdpm = customer.invoice_settings?.default_payment_method
        defaultPaymentMethodId = typeof cdpm === 'string' ? cdpm : (cdpm as Stripe.PaymentMethod | null)?.id ?? null
      } catch (custErr) {
        console.warn('[stripe-webhook] could not retrieve customer for PM:', (custErr as Error).message)
      }
    }

    const monthlySub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency:    'eur',
          unit_amount: Math.round(monthlyContributionEur * 100),
          product_data: {
            name:        'Monthly Contribution – Hindu Association of Ireland',
            description: `Monthly contribution by ${memberName}`,
          },
          recurring: { interval: 'month' as const },
        },
      }],
      trial_end:  trialEnd,
      ...(defaultPaymentMethodId ? { default_payment_method: defaultPaymentMethodId } : {}),
      metadata: {
        kind:         'monthly_contribution',
        amountEur:    String(monthlyContributionEur),
        memberId:     memberId ?? '',
        memberEmail:  memberEmail ?? '',
        memberName,
        membershipId,
        planName,
      },
    })

    await supabase
      .from('memberships')
      .update({ monthly_stripe_sub_id: monthlySub.id })
      .eq('id', membershipId)

    console.log(
      '[stripe-webhook] monthly contribution sub', monthlySub.id,
      'created for', memberEmail,
      'trial until', nextMonthStart.toISOString(),
      'default_pm:', defaultPaymentMethodId ?? 'none',
    )
  } catch (subErr) {
    // Log the full error so it appears in Netlify function logs.
    console.error(
      '[stripe-webhook] monthly contribution setup FAILED for membership', membershipId,
      '— error:', (subErr as Error).message,
      '— customer:', customerId,
      '— amount:', monthlyContributionEur,
    )
  }
}
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors related to `stripe-webhook.ts`. (Other pre-existing errors in unrelated files are fine.)

- [ ] **Step 4: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add netlify/functions/stripe-webhook.ts
git commit -m "fix: pass default_payment_method when creating monthly contribution subscription"
```

---

## Task 2: Fix addedMonthly Hardcode in Welcome Email

**Problem:** `buildMembershipWelcomeEmailHtml` has a conditional monthly section, but the webhook always passes `addedMonthly: false`, so customers who did add a monthly contribution never see the acknowledgement in their welcome email.

**Files:**
- Modify: `netlify/functions/stripe-webhook.ts` — the welcome email send block

- [ ] **Step 1: Find the email send block**

In `stripe-webhook.ts`, find:
```typescript
const emailParams: MembershipWelcomeEmailParams = {
  memberName,
  memberCode,
  memberEmail,
  planName,
  addedMonthly: false, // standalone monthly giving is a separate flow
}
```

- [ ] **Step 2: Replace `addedMonthly: false` with the real value**

```typescript
const emailParams: MembershipWelcomeEmailParams = {
  memberName,
  memberCode,
  memberEmail,
  planName,
  addedMonthly: monthlyContributionEurEarly >= 1,
}
```

The variable `monthlyContributionEurEarly` is already declared above this block (it is the parsed monthly amount from session metadata).

- [ ] **Step 3: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add netlify/functions/stripe-webhook.ts
git commit -m "fix: pass real addedMonthly flag to welcome email when monthly contribution selected"
```

---

## Task 3: Create Monthly Reminder Email Template

**Files:**
- Create: `netlify/functions/lib/monthlyReminderEmailTemplate.ts`

- [ ] **Step 1: Create the template file**

Create `netlify/functions/lib/monthlyReminderEmailTemplate.ts` with the following content. The branding matches the existing `membershipEmailTemplate.ts` (orange/amber header, `Om Shree Ganeshaya Namah` prefix, HAI sign-off, white card on stone-50 background):

```typescript
/**
 * netlify/functions/lib/monthlyReminderEmailTemplate.ts
 *
 * HTML + plain-text reminder email sent 3 days before each monthly
 * contribution charge. Triggered by the Stripe invoice.upcoming webhook.
 */

export interface MonthlyReminderEmailParams {
  memberName:   string  // e.g. "Priya Sharma"
  memberEmail:  string  // recipient address
  amountEur:    number  // e.g. 25
  chargeDate:   string  // human-readable, e.g. "1 July 2026"
  planName:     string  // e.g. "Annual"
}

export function buildMonthlyReminderEmailHtml(p: MonthlyReminderEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Upcoming Monthly Contribution – Hindu Association of Ireland</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c,#d97706);padding:36px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;
                         color:#fed7aa;font-family:Arial,sans-serif;">
                Om Shree Ganeshaya Namah
              </p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;
                          line-height:1.3;">
                Upcoming Monthly Contribution
              </h1>
              <p style="margin:12px 0 0;font-size:14px;color:#fed7aa;font-family:Arial,sans-serif;">
                Hindu Association of Ireland
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:16px;color:#1c1917;font-family:Arial,sans-serif;">
                      Dear ${p.memberName},
                    </p>
                  </td>
                </tr>

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      This is a friendly reminder that your monthly contribution to the
                      <strong>Hindu Association of Ireland</strong> is scheduled to be charged
                      in <strong>3 days</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Payment details box -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;
                                     letter-spacing:1px;color:#9a3412;font-family:Arial,sans-serif;">
                            Payment Schedule
                          </p>
                          <p style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ea580c;
                                     font-family:Arial,sans-serif;">
                            &euro;${p.amountEur.toFixed(2)}
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;
                                          padding-bottom:6px;">
                                <strong>Charge date:</strong>&nbsp;&nbsp;${p.chargeDate}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;
                                          padding-bottom:6px;">
                                <strong>Membership plan:</strong>&nbsp;&nbsp;${p.planName}
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#92400e;font-family:Arial,sans-serif;">
                                <strong>Frequency:</strong>&nbsp;&nbsp;Monthly, recurring
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Info note -->
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#57534e;font-family:Arial,sans-serif;">
                      No action is needed — this is a courtesy notification only. Your payment
                      will be processed automatically using the payment method on file.
                    </p>
                    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#57534e;font-family:Arial,sans-serif;">
                      If you wish to cancel or update your contribution, please contact us at
                      <a href="mailto:community@hindutemple.ie"
                         style="color:#ea580c;text-decoration:none;">community@hindutemple.ie</a>
                      before the charge date.
                    </p>
                  </td>
                </tr>

                <!-- Thank you note -->
                <tr>
                  <td style="padding:0 0 24px;border-top:1px solid #e7e5e4;padding-top:20px;">
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;font-family:Arial,sans-serif;">
                      Your continued generosity sustains our weekly satsangs, community prayers,
                      cultural festivals, and the long-term mission of establishing a permanent
                      Hindu Temple in Limerick. <strong>Thank you for your ongoing support.</strong>
                    </p>
                  </td>
                </tr>

                <!-- Sign-off -->
                <tr>
                  <td style="padding:0;">
                    <p style="margin:0 0 4px;font-size:15px;color:#44403c;font-family:Arial,sans-serif;">
                      With blessings and gratitude,
                    </p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ea580c;font-family:Arial,sans-serif;">
                      Team HAI
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#78716c;font-family:Arial,sans-serif;">
                      Hindu Association of Ireland · community@hindutemple.ie
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafaf9;border-top:1px solid #e7e5e4;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a8a29e;font-family:Arial,sans-serif;">
                Om Shanti &mdash; May you be blessed with peace and prosperity.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#a8a29e;font-family:Arial,sans-serif;">
                Hindu Association of Ireland &middot; Limerick, Ireland
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildMonthlyReminderEmailText(p: MonthlyReminderEmailParams): string {
  return [
    'Om Shree Ganeshaya Namah',
    '',
    `Dear ${p.memberName},`,
    '',
    'This is a friendly reminder that your monthly contribution to the',
    'Hindu Association of Ireland is scheduled to be charged in 3 days.',
    '',
    '--- Payment Details ---',
    `Amount:        €${p.amountEur.toFixed(2)}`,
    `Charge date:   ${p.chargeDate}`,
    `Plan:          ${p.planName}`,
    `Frequency:     Monthly, recurring`,
    '',
    'No action is needed — this is a courtesy notification only.',
    'Your payment will be processed automatically.',
    '',
    'To cancel or update your contribution, please contact us at',
    'community@hindutemple.ie before the charge date.',
    '',
    'Your generosity sustains our community. Thank you.',
    '',
    'With blessings and gratitude,',
    'Team HAI',
    'Hindu Association of Ireland · community@hindutemple.ie',
    '',
    'Om Shanti',
  ].join('\n')
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add netlify/functions/lib/monthlyReminderEmailTemplate.ts
git commit -m "feat: add HAI-branded monthly contribution reminder email template"
```

---

## Task 4: Add invoice.upcoming Handler to Stripe Webhook

**How it works:** Stripe fires `invoice.upcoming` N days before a subscription renewal. Set N = 3 in the Stripe Dashboard (Settings → Billing → Customer emails → "Days before upcoming invoice is sent"). The handler looks up the subscription metadata to identify monthly contributions and sends the reminder email.

**Files:**
- Modify: `netlify/functions/stripe-webhook.ts`

- [ ] **Step 1: Add the import for the reminder template**

At the top of `stripe-webhook.ts`, after the existing template import:
```typescript
import {
  buildMembershipWelcomeEmailHtml,
  buildMembershipWelcomeEmailText,
  type MembershipWelcomeEmailParams,
} from './lib/membershipEmailTemplate.js'
```

Add:
```typescript
import {
  buildMonthlyReminderEmailHtml,
  buildMonthlyReminderEmailText,
  type MonthlyReminderEmailParams,
} from './lib/monthlyReminderEmailTemplate.js'
```

- [ ] **Step 2: Add the invoice.upcoming case in the switch statement**

In the `switch (stripeEvent.type)` block, add before the `default:` case:

```typescript
// ─── Upcoming invoice reminder (fires 3 days before charge) ─────────────
case 'invoice.upcoming': {
  const invoice = stripeEvent.data.object as Stripe.Invoice & {
    next_payment_attempt?: number | null
  }

  // Only handle real amounts (skip €0 trial invoices).
  if ((invoice.amount_due ?? 0) === 0) break

  const subId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription as Stripe.Subscription | null)?.id ?? null
  if (!subId) break

  const sub = await stripe.subscriptions.retrieve(subId).catch(() => null)
  if (!sub || sub.metadata?.kind !== 'monthly_contribution') break

  const memberEmail = sub.metadata?.memberEmail ?? ''
  const memberName  = sub.metadata?.memberName  ?? ''
  const planName    = sub.metadata?.planName    ?? 'Annual'
  const amountEur   = (invoice.amount_due ?? 0) / 100

  // Format the charge date as "1 July 2026"
  const chargeDateMs = (invoice.next_payment_attempt ?? 0) * 1000
  const chargeDate   = chargeDateMs
    ? new Date(chargeDateMs).toLocaleDateString('en-IE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'shortly'

  if (!memberEmail || !process.env.SMTP_HOST) {
    console.log(
      '[stripe-webhook] invoice.upcoming: skipping reminder for', memberEmail || '(no email)',
      process.env.SMTP_HOST ? '' : '(SMTP not configured)',
    )
    break
  }

  try {
    const reminderParams: MonthlyReminderEmailParams = {
      memberName,
      memberEmail,
      amountEur,
      chargeDate,
      planName,
    }
    const transporter = createMailTransporter()
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM ?? `"Hindu Association of Ireland" <${process.env.SMTP_USER}>`,
      to:      memberEmail,
      subject: `Upcoming monthly contribution of €${amountEur.toFixed(2)} – Hindu Association of Ireland`,
      html:    buildMonthlyReminderEmailHtml(reminderParams),
      text:    buildMonthlyReminderEmailText(reminderParams),
    })
    console.log(
      '[stripe-webhook] invoice.upcoming reminder sent to', memberEmail,
      'for €', amountEur, 'on', chargeDate,
    )
  } catch (emailErr) {
    console.error('[stripe-webhook] invoice.upcoming email error:', (emailErr as Error).message)
  }
  break
}
```

- [ ] **Step 3: Configure Stripe to send invoice.upcoming 3 days before renewal**

This is a one-time Stripe Dashboard configuration — it cannot be done in code:

1. Open [https://dashboard.stripe.com/settings/billing/automatic](https://dashboard.stripe.com/settings/billing/automatic) (or Stripe Dashboard → Settings → Billing → Subscriptions and emails)
2. Under **"Send a reminder before a subscription invoice is finalized"**, set to **3 days**
3. Ensure `invoice.upcoming` is listed under the webhook endpoint's subscribed events in the Stripe Dashboard. Add it if missing.

- [ ] **Step 4: Verify the file compiles**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add netlify/functions/stripe-webhook.ts
git commit -m "feat: send 3-day reminder email on invoice.upcoming for monthly contributions"
```

---

## Task 5: Embed monthly_eur in Membership Success URL

**Why:** The success page currently has no way to know the customer added a monthly contribution. We embed the amount as a static URL param alongside the Stripe `{CHECKOUT_SESSION_ID}` placeholder.

**Files:**
- Modify: `netlify/functions/create-checkout-session.ts`

- [ ] **Step 1: Find the membership success_url line**

In `create-checkout-session.ts`, find (around line 479):
```typescript
success_url: `${m.successUrl ?? `${origin}/membership-success`}?session_id={CHECKOUT_SESSION_ID}`,
```

- [ ] **Step 2: Replace it with the monthly-aware version**

```typescript
success_url: `${m.successUrl ?? `${origin}/membership-success`}?session_id={CHECKOUT_SESSION_ID}${m.monthlyContributionEur ? `&monthly_eur=${m.monthlyContributionEur}` : ''}`,
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add netlify/functions/create-checkout-session.ts
git commit -m "feat: embed monthly_eur in membership success URL for post-checkout display"
```

---

## Task 6: Show Monthly Contribution on the Payment Success Page

**Files:**
- Modify: `src/components/pages/PaymentSuccessPage.tsx`

- [ ] **Step 1: Locate the membership variant copy object**

In `PaymentSuccessPage.tsx`, find:
```typescript
const COPY = {
  donation: { ... },
  membership: {
    title: 'Welcome to the Hindu Association of Ireland!',
    body:  "Your membership is being activated...",
    cta:   'View Events',
    ctaTo: '/events',
  },
} as const
```

- [ ] **Step 2: Read the monthly_eur URL param at the top of the component**

Add after the existing `search` constant (which is already declared as `new URLSearchParams(useLocation().search)`):

```typescript
const monthlyEur = search.get('monthly_eur') ? parseFloat(search.get('monthly_eur')!) : null
```

- [ ] **Step 3: Add the monthly contribution info card inside the membership success render**

The membership variant currently renders a simple card. Find the closing `</div>` before the `Om Shanti` footer paragraph in the membership/donation branch and insert the monthly card immediately before the button row:

Replace the membership/donation return block's inner content. Find:
```tsx
<p className="text-muted-foreground text-base md:text-lg leading-relaxed">
  {copy.body}
</p>
<div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
```

Replace with:
```tsx
<p className="text-muted-foreground text-base md:text-lg leading-relaxed">
  {copy.body}
</p>

{/* Monthly contribution confirmation — only shown when monthly_eur is in URL */}
{variant === 'membership' && monthlyEur && (
  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-left space-y-2">
    <div className="flex items-center gap-2 mb-1">
      <Heart weight="fill" size={16} className="text-amber-600 shrink-0" />
      <span className="text-sm font-semibold text-amber-900">Monthly contribution added</span>
    </div>
    <p className="text-sm text-amber-800 leading-relaxed">
      Your <strong>€{monthlyEur}/month</strong> contribution will begin on the
      <strong> 1st of next month</strong> and continue monthly until cancelled.
      No charge today.
    </p>
    <p className="text-xs text-amber-600">
      You will receive a reminder email 3 days before each charge.
    </p>
  </div>
)}

<div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
```

- [ ] **Step 4: Confirm `Heart` is already imported**

Check the import line at the top of `PaymentSuccessPage.tsx`. It should include:
```typescript
import { CheckCircle, House, Heart, ... } from '@phosphor-icons/react'
```

`Heart` is already imported in this file.

- [ ] **Step 5: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add src/components/pages/PaymentSuccessPage.tsx
git commit -m "feat: show monthly contribution summary card on membership success page"
```

---

## Task 7: Add Payment History Hook

**Purpose:** Fetch a member's past monthly contribution charges from the `donations` table, keyed by `stripe_subscription_id`. Used by the admin timeline.

**Files:**
- Modify: `src/hooks/useMembership.ts`

- [ ] **Step 1: Add the DonationHistoryEntry type at the top of the file**

After the existing imports in `useMembership.ts`, add:

```typescript
export interface DonationHistoryEntry {
  id:         string
  date:       string  // YYYY-MM-DD
  amountEur:  number
  status:     'succeeded' | 'failed' | 'refunded'
}
```

- [ ] **Step 2: Add the useMemberPaymentHistory hook at the bottom of the file (after the useMembership export)**

```typescript
/**
 * Fetches past monthly contribution charges for a single membership.
 * Returns rows from the donations table that belong to the monthly
 * Stripe subscription linked to this membership record.
 */
export function useMemberPaymentHistory(monthlyStripeSubId: string | undefined) {
  const [history, setHistory]   = useState<DonationHistoryEntry[]>([])
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (!monthlyStripeSubId) { setHistory([]); return }

    setLoading(true)
    supabase
      .from('donations')
      .select('id, amount_eur, status, created_at')
      .eq('stripe_subscription_id', monthlyStripeSubId)
      .in('status', ['succeeded', 'failed', 'refunded'])
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          console.error('[useMemberPaymentHistory] fetch error:', err.message)
        } else {
          setHistory(
            (data ?? []).map((row: { id: string; amount_eur: number; status: string; created_at: string }) => ({
              id:        row.id,
              date:      row.created_at.slice(0, 10),
              amountEur: Number(row.amount_eur),
              status:    row.status as DonationHistoryEntry['status'],
            })),
          )
        }
        setLoading(false)
      })
  }, [monthlyStripeSubId])

  return { history, loading }
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add src/hooks/useMembership.ts
git commit -m "feat: add useMemberPaymentHistory hook for admin payment timeline"
```

---

## Task 8: Add Payment Timeline to Admin Member Detail Panel

**What it shows:**
- Annual membership payment (synthetic entry from `member.startDate` + plan price)
- Annual renewal (synthetic from `member.expiresOn` + plan price, only if in future)
- Past monthly charges (from `useMemberPaymentHistory`)
- Upcoming monthly charges (derived: 1st of each month from billing start until `expiresOn` or 6 months ahead, skipping months already in history)

**Files:**
- Modify: `src/components/admin/sections/MembersSection.tsx`

- [ ] **Step 1: Add the hook import**

At the top of `MembersSection.tsx`, add to the existing `useMembership` import:

```typescript
import { useMembership, useMemberPaymentHistory, type DonationHistoryEntry } from '@/hooks/useMembership'
```

Remove the old `import { useMembership } from '@/hooks/useMembership'` line if it exists separately.

- [ ] **Step 2: Add helper imports from Phosphor icons**

In `MembersSection.tsx`, the icons import block already has many icons. Add to it:
```typescript
CalendarCheck,
```

The full import line should include `CalendarCheck` alongside the existing icons. Find the `@phosphor-icons/react` import and add `CalendarCheck` to the list.

- [ ] **Step 3: Add the PaymentTimeline component just before the MemberDetailSheet component**

Insert this new component into `MembersSection.tsx` before `function MemberDetailSheet(`:

```typescript
// ── Payment Timeline ──────────────────────────────────────────────────────────

interface TimelineEntry {
  key:       string
  date:      string  // YYYY-MM-DD
  amountEur: number
  type:      'annual' | 'monthly'
  status:    'paid' | 'scheduled' | 'failed' | 'refunded'
  label:     string
}

function deriveUpcomingMonthly(
  member: MembershipRecord,
  paidDates: Set<string>,
): TimelineEntry[] {
  if (!member.monthlyContributionEur || !member.monthlyStripeSubId) return []

  // billing starts on 1st of month after startDate
  const startParts = member.startDate
    ? member.startDate.split('-').map(Number)
    : null
  if (!startParts || startParts.length < 3) return []
  const billingStart = new Date(Date.UTC(startParts[0], startParts[1], 1)) // month+1 → next month

  const expiresOn = member.expiresOn
    ? new Date(member.expiresOn + 'T00:00:00Z')
    : null
  const cutoff = expiresOn ?? new Date(Date.UTC(
    billingStart.getUTCFullYear(),
    billingStart.getUTCMonth() + 6,
    1,
  ))

  const today   = new Date()
  const entries: TimelineEntry[] = []
  let   d       = new Date(billingStart)

  while (d <= cutoff && entries.length < 12) {
    const dateStr = d.toISOString().slice(0, 10)
    if (d > today && !paidDates.has(dateStr)) {
      entries.push({
        key:       `monthly-upcoming-${dateStr}`,
        date:      dateStr,
        amountEur: member.monthlyContributionEur,
        type:      'monthly',
        status:    'scheduled',
        label:     'Monthly contribution',
      })
    }
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  }
  return entries
}

function PaymentTimeline({
  member,
  planPrice,
  planName,
}: {
  member:    MembershipRecord
  planPrice: number
  planName:  string
}) {
  const { history, loading } = useMemberPaymentHistory(member.monthlyStripeSubId)

  const entries = useMemo<TimelineEntry[]>(() => {
    const today = new Date()

    // ── Annual: initial payment ──────────────────────────────────────────
    const all: TimelineEntry[] = []
    if (member.startDate) {
      all.push({
        key:       'annual-paid',
        date:      member.startDate,
        amountEur: planPrice,
        type:      'annual',
        status:    'paid',
        label:     `${planName} membership`,
      })
    }

    // ── Annual: upcoming renewal ─────────────────────────────────────────
    if (member.expiresOn && new Date(member.expiresOn + 'T00:00:00Z') > today) {
      all.push({
        key:       'annual-renewal',
        date:      member.expiresOn,
        amountEur: planPrice,
        type:      'annual',
        status:    'scheduled',
        label:     `${planName} membership renewal`,
      })
    }

    // ── Monthly: past charges ────────────────────────────────────────────
    for (const h of history) {
      all.push({
        key:       h.id,
        date:      h.date,
        amountEur: h.amountEur,
        type:      'monthly',
        status:    h.status === 'succeeded' ? 'paid' : h.status,
        label:     'Monthly contribution',
      })
    }

    // ── Monthly: upcoming (derived) ──────────────────────────────────────
    const paidDates = new Set(history.map((h) => h.date))
    for (const u of deriveUpcomingMonthly(member, paidDates)) {
      all.push(u)
    }

    // Sort ascending by date
    return all.sort((a, b) => a.date.localeCompare(b.date))
  }, [member, planPrice, planName, history])

  const STATUS_STYLES: Record<TimelineEntry['status'], { dot: string; badge: string; label: string }> = {
    paid:     { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',   label: 'Paid'      },
    scheduled:{ dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 border-blue-200',             label: 'Scheduled' },
    failed:   { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',                label: 'Failed'    },
    refunded: { dot: 'bg-slate-400',  badge: 'bg-slate-50 text-slate-600 border-slate-200',          label: 'Refunded'  },
  }

  if (loading) {
    return (
      <div className="text-xs text-slate-400 py-4 text-center">
        Loading payment history…
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-4 text-center">
        No payment records yet.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

      <div className="space-y-3">
        {entries.map((e) => {
          const s = STATUS_STYLES[e.status]
          const isUpcoming = e.status === 'scheduled'
          return (
            <div key={e.key} className="flex items-start gap-3">
              {/* Dot */}
              <div
                className={cn(
                  'mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shrink-0 z-10',
                  s.dot,
                  isUpcoming && 'opacity-60',
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={cn('text-sm font-medium', isUpcoming ? 'text-slate-400' : 'text-slate-800')}>
                    {e.label}
                  </span>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border',
                    s.badge,
                  )}>
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">{e.date}</span>
                  <span className={cn('text-xs font-bold', isUpcoming ? 'text-slate-400' : 'text-slate-700')}>
                    €{e.amountEur.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{e.type}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire PaymentTimeline into the MemberDetailSheet**

In `MemberDetailSheet`, find the existing "Monthly Contribution" section:
```tsx
{member.monthlyContributionEur && (
  <>
    <Separator className="bg-slate-100" />
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Monthly Contribution
        </h4>
```

**After** that entire existing monthly contribution block (i.e., after its closing `</>`) — and also outside any existing conditional — add the Payment Timeline section. It should always show (even without monthly contributions it shows the annual payment and renewal). Find the closing `</div>` of the member details section (the one that contains the grid of plan/status/dates) and add after the Monthly Contribution block and before the Actions footer:

```tsx
{/* Payment Timeline */}
<Separator className="bg-slate-100" />
<div className="space-y-3">
  <div className="flex items-center gap-2">
    <CalendarCheck size={14} weight="bold" className="text-slate-500" />
    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
      Payment History &amp; Schedule
    </h4>
  </div>
  <PaymentTimeline
    member={member}
    planPrice={planPrice}
    planName={planName}
  />
</div>
```

The `MemberDetailSheet` component currently receives `member: MembershipRecord | null`. You need to also pass `planPrice` and `planName`. 

Update the `MemberDetailSheet` props interface to add:
```typescript
planPrice: number
planName:  string
```

And in the parent (`MembersSection`), where `MemberDetailSheet` is rendered, look up the plan from `getPlan(member.planId)` to pass these props:

```tsx
<MemberDetailSheet
  member={selected}
  onClose={() => setSelected(null)}
  onStatusChange={handleStatusChange}
  onCancel={handleCancel}
  onRenew={handleRenew}
  onDelete={handleDelete}
  canWrite={canWrite}
  planPrice={getPlan(selected?.planId ?? '')?.price ?? 0}
  planName={getPlan(selected?.planId ?? '')?.name ?? selected?.planId ?? ''}
/>
```

Find the existing `<MemberDetailSheet` render in `MembersSection` and update it accordingly.

- [ ] **Step 5: Verify the file compiles**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
npx tsc --noEmit --project tsconfig.json 2>&1 | head -40
```

Expected: no errors in `MembersSection.tsx` or `useMembership.ts`.

- [ ] **Step 6: Commit**

```bash
cd "/Users/prashant/Documents/Application directory/HinduT"
git add src/hooks/useMembership.ts src/components/admin/sections/MembersSection.tsx
git commit -m "feat: add per-member payment history and schedule timeline in admin panel"
```

---

## Task 9: Stripe Dashboard Setup (Manual)

These are one-time operational steps that cannot be automated in code:

- [ ] **Step 1: Enable invoice.upcoming webhook event**

In Stripe Dashboard → Developers → Webhooks → your webhook endpoint → Edit:
- Add `invoice.upcoming` to the list of subscribed events

- [ ] **Step 2: Set reminder timing to 3 days**

In Stripe Dashboard → Settings → Billing → Subscriptions and emails:
- Under "Send a reminder before a subscription invoice is finalized" or "Days before upcoming invoice" — set to **3**

- [ ] **Step 3: Verify in Stripe that the new monthly subscription gets created**

After deploying the Task 1 fix, test by completing a membership checkout with a monthly contribution selected. Then in Stripe Dashboard → Customers → [the customer] → Subscriptions — you should see **two** subscriptions:
1. The annual membership subscription
2. The monthly contribution subscription (status: `trialing`, trial end = 1st of next month)

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Annual membership charges same day | Already working — no change needed |
| Monthly giving starts 1st of next month | Task 1 (fix creation), already designed with `trial_end` |
| 3-day reminder email before monthly charge | Tasks 3 + 4 |
| Reminder uses org-specific template/logo | Task 3 (matches HAI branding) |
| Admin sees scheduled payments per member | Task 8 (upcoming derived entries) |
| Admin sees actual payments per member | Tasks 7 + 8 (history from donations table) |
| Post-checkout monthly confirmation | Tasks 5 + 6 |
| Welcome email acknowledges monthly contribution | Task 2 |

**Placeholder scan:** No TBDs or incomplete sections.

**Type consistency:**
- `DonationHistoryEntry` defined in Task 7, used in Task 8 — consistent.
- `TimelineEntry` defined and used entirely within `MembersSection.tsx` — consistent.
- `planPrice` / `planName` props added to `MemberDetailSheet` in Task 8 and passed from the parent in the same task — consistent.
- `MonthlyReminderEmailParams` defined in Task 3, imported in Task 4 — consistent.
