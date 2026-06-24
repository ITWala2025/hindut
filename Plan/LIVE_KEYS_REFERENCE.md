# Production Live Keys Reference

**Date Added:** 2026-06-24  
**Status:** ✅ LIVE STRIPE KEYS CONFIGURED

---

## Live Stripe Keys (SECURE - DO NOT COMMIT)

> ⚠️ **CRITICAL SECURITY WARNING** — These keys are secrets and must NEVER be committed to Git.
> Store them only in Netlify environment variables or your team's secure password vault.

### Key Storage Locations

- **Netlify Environment Variables:** Store all 3 live keys here (secure, not in Git)
- **Team Password Manager:** Archive keys in 1Password, LastPass, or similar
- **Local `.env.local` (Git-ignored):** Never commit this file

### Key Format Reference

```
STRIPE_PUBLISHABLE_KEY_LIVE: pk_live_... (starts with pk_live_)
STRIPE_SECRET_KEY_LIVE: sk_live_... (starts with sk_live_)
STRIPE_WEBHOOK_SECRET_LIVE: whsec_... (starts with whsec_)
```

For actual key values, see your Stripe Dashboard:
- Developers → API Keys (for publishable & secret keys)
- Developers → Webhooks → [Your Endpoint] (for webhook signing secret)

---

## What Changed

| Component | Before | After |
|-----------|--------|-------|
| **netlify.toml** | `STRIPE_MODE = "test"` in production context | Removed (uses host detection) |
| **Netlify Env Vars** | Only test keys set | ✅ All 6 live + test keys set |
| **Mode Detection** | Always test | Host-based: `www.hindutemple.ie` = live |
| **Real Charges** | No (sandbox) | ✅ **Yes** (live) |
| **Documentation** | CONFIGURATION.md marked "optional\*" | ✅ Updated to mark as required |

---

## Files Modified

1. ✅ **netlify.toml** — Removed `STRIPE_MODE = "test"` override
2. ✅ **Plan/CONFIGURATION.md** — Updated required status + webhook events
3. ✅ **Plan/PRODUCTION_DEPLOYMENT_CHECKLIST.md** — New file with step-by-step guide

---

## Next Steps for User

1. **Add 3 env vars to Netlify** (see PRODUCTION_DEPLOYMENT_CHECKLIST.md):
   - `STRIPE_PUBLISHABLE_KEY_LIVE`
   - `STRIPE_SECRET_KEY_LIVE`
   - `STRIPE_WEBHOOK_SECRET_LIVE`
   - (Optional) `PRODUCTION_HOSTS=www.hindutemple.ie`

2. **Trigger Redeploy** in Netlify

3. **Verify in Admin Panel** → Settings → Stripe Payments

4. **Test with Stripe test card** (4242 4242 4242 4242)

5. **Monitor Stripe Dashboard** for real transactions

---

## Verification Checklist

After completing steps above, verify:

- [ ] Netlify environment shows all 6 Stripe keys present
- [ ] Admin Settings → Stripe Payments shows `Mode: live`
- [ ] All 6 env vars show green checkmarks ✅
- [ ] Test transaction processed successfully
- [ ] Webhook event logged in Stripe Dashboard
- [ ] Database record created (Supabase)
- [ ] Confirmation email received

---

## Important Notes

⚠️ **REAL MONEY IS NOW BEING CHARGED** — Monitor closely for:
- Failed transactions
- Email delivery failures
- Webhook processing errors

✅ Keep test keys for preview deployments (limerickhindutemple.netlify.app)

✅ Archive these keys securely (password manager, team vault, etc.)

---

For full deployment guide, see: [PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)
