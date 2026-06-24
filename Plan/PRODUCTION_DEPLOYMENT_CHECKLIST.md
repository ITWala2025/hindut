# Production Deployment Checklist

**Date:** 2026-06-24
**Status:** Moving to Live Stripe Keys

---

## Step 1: Add Live Stripe Keys to Netlify Environment Variables

Go to **Netlify Dashboard** → Your Site → **Settings** → **Build & deploy** → **Environment** → **Edit variables**

Add these 3 new environment variables (DO NOT remove test keys — keep both for preview site):

### 1. STRIPE_PUBLISHABLE_KEY_LIVE
```
Key:   STRIPE_PUBLISHABLE_KEY_LIVE
Value: pk_live_... (from your Stripe Dashboard → Developers → API Keys)
```

### 2. STRIPE_SECRET_KEY_LIVE
```
Key:   STRIPE_SECRET_KEY_LIVE
Value: sk_live_... (from your Stripe Dashboard → Developers → API Keys)
```

### 3. STRIPE_WEBHOOK_SECRET_LIVE
```
Key:   STRIPE_WEBHOOK_SECRET_LIVE
Value: whsec_... (from your Stripe Dashboard → Developers → Webhooks → Signing secret)
```

> ⚠️ **NEVER commit actual API keys to Git** — Use Netlify's secure environment variables instead.

### 4. PRODUCTION_HOSTS (Optional but Recommended)
```
Key:   PRODUCTION_HOSTS
Value: www.hindutemple.ie
```
*Use only if your production domain is www.hindutemple.ie. Leave blank to use default.*

---

## Step 2: Verify Environment Variables in Netlify

After adding all 4 variables:

1. Click **Save**
2. Wait for confirmation message
3. Go to **Deploys** section
4. Click **Trigger deploy** → **Deploy site**
5. Wait for green checkmark (deployment complete, usually 2-3 minutes)

---

## Step 3: Verify Configuration in Admin Portal

After deployment completes:

1. Navigate to: `https://www.hindutemple.ie/admin` (or your production URL)
2. Sign in as admin
3. Go to: **Settings** → **Stripe Payments**
4. You should see:
   - ✅ **Mode:** `live`
   - ✅ **Source:** `host` (or `env-override` if STRIPE_MODE set)
   - ✅ All 6 environment variables shown as **Present** (green checkmarks):
     - STRIPE_SECRET_KEY_LIVE ✅
     - STRIPE_PUBLISHABLE_KEY_LIVE ✅
     - STRIPE_WEBHOOK_SECRET_LIVE ✅
     - STRIPE_SECRET_KEY_TEST ✅
     - STRIPE_PUBLISHABLE_KEY_TEST ✅
     - STRIPE_WEBHOOK_SECRET_TEST ✅

---

## Step 4: Test Live Mode (Important!)

**⚠️ DO NOT skip this step — use test card to verify webhooks work**

1. Visit your production site donation/membership checkout
2. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits
3. Complete a test transaction
4. Verify in Stripe Dashboard:
   - Payment appears in **Developers** → **Events** (webhook logs)
   - Transaction shows in **Payments** section
5. Check your database (Supabase):
   - Donation/membership record created
   - Status = `succeeded`
   - Webhook event processed ✅

---

## Step 5: Switch Preview Site to Test Mode (Recommended)

To keep preview deployments in test mode while production uses live:

**In Netlify Environment for Preview/Branch Deploys:**

Add this variable to `context.deploy-preview.environment` in `netlify.toml`:

```toml
[context.deploy-preview.environment]
  STRIPE_MODE = "test"
```

This ensures all preview builds always use test keys, preventing accidental live charges on preview URLs.

---

## Step 6: Verify Webhook Endpoint

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Verify you have **TWO** endpoints:
   - ✅ **Test Mode:** `https://www.hindutemple.ie/.netlify/functions/stripe-webhook`
   - ✅ **Live Mode:** `https://www.hindutemple.ie/.netlify/functions/stripe-webhook`
3. Each endpoint should subscribe to:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
   - `invoice.payment_failed`
   - `charge.refunded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.upcoming`

---

## Step 7: Database Configuration

The `payment_settings` singleton row should have:
- `mode_override` = `'auto'` (uses host detection)
- Last updated timestamp should reflect today

To verify in Supabase:

```sql
SELECT id, mode_override, updated_at FROM payment_settings LIMIT 1;
```

Expected output:
```
id | mode_override | updated_at
1  | auto          | 2026-06-24 ...
```

---

## Summary: What Changed

| Component | Test Mode | Live Mode |
|-----------|-----------|-----------|
| **Netlify toml** | `STRIPE_MODE = "test"` removed | Host detection enabled |
| **Publishable Key** | `pk_test_...` | `pk_live_...` ✅ |
| **Secret Key** | `sk_test_...` | `sk_live_...` ✅ |
| **Webhook Secret** | `whsec_test_...` | `whsec_...` ✅ |
| **Real Charges** | No (test mode) | **Yes** ⚠️ |
| **Production URL** | `limerickhindutemple.netlify.app` | `www.hindutemple.ie` |

---

## Important Reminders

⚠️ **LIVE MODE IS NOW ACTIVE** — Real charges will be processed for all transactions on production domain.

- ✅ Keep test keys for preview/preview deployments
- ✅ Always test with test cards before confirming
- ✅ Monitor Stripe Dashboard for transactions
- ✅ Check email confirmations reach donors/members
- ✅ Keep webhook logs monitored for errors

---

## Troubleshooting

### Issue: Admin shows "Mode: test" but should be "live"

**Check:**
1. Did you add `STRIPE_SECRET_KEY_LIVE` to Netlify env vars?
2. Did you trigger a redeploy after adding env vars?
3. Is `PRODUCTION_HOSTS` set correctly?
4. Is `STRIPE_MODE` set to override? (should be empty/unset for production)

### Issue: Webhook events not appearing

**Check:**
1. Stripe Dashboard → Developers → Webhooks → Live mode endpoint
2. Click endpoint → scroll to "Events" section
3. Look for recent webhook deliveries (green = succeeded, red = failed)
4. If red, click event to see error details
5. Common issues:
   - Wrong webhook URL
   - Missing webhook secret in Netlify env vars
   - Function timeout (check logs)

### Issue: Test charge succeeded but no email received

**Check:**
1. Netlify Functions logs: `Netlify.com` → Site → **Functions** → **stripe-webhook**
2. Look for `[stripe-webhook]` entries
3. Check if `SMTP_*` variables are set (email sending requires these)
4. Verify email isn't in spam folder

---

## Next Steps

After completing all steps above:

1. ✅ Announce production launch
2. ✅ Monitor Stripe Dashboard for real transactions
3. ✅ Set up alerts in Stripe for failed payments
4. ✅ Document any custom configurations in your team wiki
5. ✅ Set calendar reminder to review live metrics monthly

---

*For more details, see [CONFIGURATION.md](CONFIGURATION.md)*
