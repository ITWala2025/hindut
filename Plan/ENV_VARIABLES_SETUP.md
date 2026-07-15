# Environment Variables Setup Instructions

## Quick Reference: All Required Environment Variables

Copy and paste these key-value pairs into your Netlify Environment Variables:

```
SMTP_HOST=smtppro.zoho.eu
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=community@hindutemple.ie
SMTP_PASS=Haidonation2026$
EMAIL_FROM=community@hindutemple.ie
CONTACT_ADMIN_EMAIL=community@hindutemple.ie
```

---

## Step-by-Step Netlify Setup

### 1. Navigate to Environment Variables
```
1. Go to: https://app.netlify.com
2. Select your site: "limerickhindutemple"
3. Click: Settings
4. Click: Build & deploy
5. Click: Environment
6. Click: Edit variables
```

### 2. Add Variables (7 Total)

Click "Add variable" for each:

#### Variable 1: SMTP_HOST
```
Key:   SMTP_HOST
Value: smtppro.zoho.eu
```

#### Variable 2: SMTP_PORT
```
Key:   SMTP_PORT
Value: 465
```

#### Variable 3: SMTP_SECURE
```
Key:   SMTP_SECURE
Value: true
```

#### Variable 4: SMTP_USER
```
Key:   SMTP_USER
Value: community@hindutemple.ie
```

#### Variable 5: SMTP_PASS
```
Key:   SMTP_PASS
Value: Haidonation2026$
```

#### Variable 6: EMAIL_FROM
```
Key:   EMAIL_FROM
Value: community@hindutemple.ie
```

#### Variable 7: CONTACT_ADMIN_EMAIL
```
Key:   CONTACT_ADMIN_EMAIL
Value: community@hindutemple.ie
```

### 3. Save Variables
- Click "Save" button
- Wait for confirmation message

### 4. Trigger Redeploy
```
1. Navigate to: Deploys
2. Click: Trigger deploy → Deploy site
3. Wait for build to complete (usually 2-3 minutes)
4. Check: The green checkmark indicates success
```

---

## Verification Checklist

After adding environment variables:

- [ ] All 7 variables added to Netlify
- [ ] No typos in variable names or values
- [ ] Values match exactly (case-sensitive!)
- [ ] Redeploy triggered and completed
- [ ] Netlify shows green checkmark

---

## Testing After Setup

### 1. Test URL
```
https://limerickhindutemple.netlify.app/contact
```

### 2. Fill Form
- Name: Test User
- Email: your-email@example.com
- Phone: +353 87 123 4567
- Subject: Testing contact form
- Message: This is a test message to verify the email system is working correctly.

### 3. Submit & Verify
- [ ] Form shows "Thank you for your message!" message
- [ ] Check your email for confirmation (from community@hindutemple.ie)
- [ ] Check community@hindutemple.ie for admin notification
- [ ] Both emails arrive within 1-2 minutes
- [ ] Emails look professional and include all information

---

## Troubleshooting

### Issue: Form shows error after submission

**Check:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Common errors:
   - "Invalid email address" → Check email format
   - "Name must be at least 2 characters" → Check name length
   - "Message must be at least 10 characters" → Message too short

### Issue: Form submits but no email arrives

**Check in this order:**
1. Open Netlify dashboard
2. Go to: Site → Functions → contact-submit
3. Look for function logs
4. Check for errors (red text)
5. Common issues:
   - Missing environment variables
   - Typo in SMTP credentials
   - Zoho Mail account locked/inactive
   - Check spam folders (Gmail, Outlook, etc.)

### Issue: "Sending..." button stuck

**Problem:** Function is taking too long or failed silently

**Solution:**
1. Refresh page
2. Check browser console for errors
3. Wait 30 seconds, try again
4. Check Netlify function logs

---

## Zoho Mail SMTP Reference

### Global SMTP Settings
| Setting | Value |
|---------|-------|
| SMTP Host (Global) | smtp.zoho.com |
| SMTP Host (EU) | smtp.zoho.eu |
| SMTP Port | 587 (STARTTLS) or 465 (SSL) |
| Security | STARTTLS (587) or SSL (465) |

### We're Using:
- **SMTP Host**: smtp.zoho.eu (Ireland is in EU)
- **SMTP Port**: 587
- **Security**: STARTTLS
- **Auth**: Yes (username & password required)

### Alternative: If You Need Global Settings
If emails aren't working with smtp.zoho.eu, try:
```
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_SECURE=true
```
Then redeploy.

---

## Important: Do NOT Change These

These are already configured and working:
- `netlify/functions/contact-submit.ts` ✅
- `netlify/functions/lib/contactEmailTemplate.ts` ✅
- `src/components/pages/ContactPage.tsx` ✅
- `netlify.toml` (functions configuration) ✅

Only add the 7 environment variables listed above.

---

## After Deployment

### Week 1
- [ ] Test form daily
- [ ] Monitor email delivery
- [ ] Check for any error patterns

### Ongoing
- [ ] Test monthly
- [ ] Monitor Netlify function logs
- [ ] Update admin email if staff changes
- [ ] Backup form submission emails

---

## Support Resources

### Zoho Mail Help
- Help Center: https://www.zoho.com/mail/help/
- SMTP Configuration: https://www.zoho.com/mail/help/mail-client.html

### Netlify Functions Docs
- Functions Overview: https://docs.netlify.com/functions/overview/
- Environment Variables: https://docs.netlify.com/configure-builds/environment-variables/
- Netlify CLI: https://docs.netlify.com/cli/get-started/

### Nodemailer (Email Library)
- Documentation: https://nodemailer.com/
- Zoho Integration: https://nodemailer.com/smtp/

---

## Estimated Time to Complete

- Reading this guide: 5 minutes
- Adding variables to Netlify: 5 minutes
- Waiting for redeploy: 3 minutes
- Testing form: 5 minutes
- **Total: ~18 minutes** ⏱️

---

## Summary

You're now ready to:
1. ✅ Add environment variables
2. ✅ Redeploy your site
3. ✅ Test the contact form
4. ✅ Receive emails from your website visitors

**No code changes needed!** Everything is already built and ready to go.

---

**Last Updated**: 2026-06-12
**Status**: Ready for Production
**Questions?** Check CONTACT_FORM_SETUP.md for detailed documentation
