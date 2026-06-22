# Contact Form Email Error Debugging Guide

## What Changed
I've updated the error handling to provide much **more detailed error messages** so you can see exactly what's failing:

- ✅ **Frontend now displays SMTP error details** to the user
- ✅ **Backend logs connection attempts and failures** with timestamps
- ✅ **Each email send is individually tracked** (confirmation vs admin)
- ✅ **Detailed SMTP configuration logging** for diagnosis
- ✅ **Connection timeouts configured** to prevent hanging

---

## How to See Detailed Errors

### Step 1: Check Browser Console
1. Open your site at https://limerickhindutemple.netlify.app/contact
2. **Open DevTools** → Press `F12` or right-click → "Inspect"
3. Go to the **Console** tab
4. Submit the contact form
5. Look for errors with details like:
   ```
   Contact form error: Failed to send email: SMTP connection failed: Temporary service unavailable
   ```

The error message will now include:
- **What failed** (SMTP connection, confirmation email, or admin email)
- **Why it failed** (specific error from Zoho SMTP)
- **What to check** (credentials, network, etc.)

---

### Step 2: Check Netlify Function Logs (Backend Logs)
This is the **most reliable way** to diagnose issues:

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Select your site: **limerickhindutemple**
3. Navigate to: **Functions** (in left sidebar)
4. Click: **contact-submit**
5. You'll see real-time logs with detailed information

**Look for these messages:**
- ✅ `Testing SMTP connection...` — Initial connection attempt
- ✅ `SMTP connection verified successfully` — Connection works
- ❌ `SMTP verification failed` — Connection problem
- ✅ `Confirmation email sent to` — First email succeeded
- ❌ `Failed to send confirmation email` — First email failed
- ✅ `Admin notification sent to` — Second email succeeded
- ❌ `Failed to send admin notification` — Second email failed

**Example of a successful flow:**
```
[contact-submit] Testing SMTP connection... { host: 'smtp.zoho.eu', port: '587', user: 'don...' }
[contact-submit] ✅ SMTP connection verified successfully
[contact-submit] ✅ Confirmation email sent to john@example.com
[contact-submit] ✅ Admin notification sent to info@hindutemple.ie
```

**Example of a failed flow:**
```
[contact-submit] Testing SMTP connection... { host: 'smtp.zoho.eu', port: '587', user: 'don...' }
[contact-submit] ❌ SMTP verification failed: Error: Invalid login
[contact-submit] Email error: { message: 'SMTP connection failed: Invalid login...', code: 'EAUTH', stack: '...' }
```

---

## Common SMTP Error Messages & Solutions

### ❌ "Invalid login" or "Authentication failed"
**Cause**: Wrong password or username
**Solution**:
1. Log into Zoho Mail: https://mail.zoho.eu
2. Verify you can log in with: `donation@hindutemple.ie` / `Haidonation2026$`
3. If 2FA is enabled, you might need an **app password** instead
4. Update `SMTP_PASS` in Netlify environment variables if needed

### ❌ "Connection timeout" or "ECONNREFUSED"
**Cause**: Can't reach SMTP server
**Solution**:
1. Verify `SMTP_HOST` is exactly: `smtp.zoho.eu`
2. Verify `SMTP_PORT` is exactly: `587`
3. Verify `SMTP_SECURE` is exactly: `false` (not "true")
4. Check Netlify environment variables have no typos

### ❌ "Temporary service unavailable"
**Cause**: Zoho server issue or rate limiting
**Solution**:
1. Wait a few minutes and retry
2. Check Zoho status: https://status.zoho.com
3. Try fewer form submissions to avoid rate limiting

### ❌ "550 Invalid recipient"
**Cause**: Email address doesn't exist
**Solution**:
1. Verify `CONTACT_ADMIN_EMAIL` in Netlify is: `info@hindutemple.ie`
2. Verify the visitor's email is correct
3. Check spam filters

---

## Checking Environment Variables

To verify all variables are set correctly:

1. Go to **Netlify Dashboard** → Your Site → **Settings**
2. Go to **Build & deploy** → **Environment**
3. Verify these exist and match exactly:

| Variable | Should Be |
|----------|-----------|
| `SMTP_HOST` | `smtppro.zoho.eu` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `donation@hindutemple.ie` |
| `SMTP_PASS` | `Haidonation2026$` |
| `EMAIL_FROM` | `donation@hindutemple.ie` |
| `CONTACT_ADMIN_EMAIL` | `info@hindutemple.ie` |

---

## Testing Zoho Connection Manually

To verify Zoho credentials work outside of the form:

### On Mac/Linux Terminal:
```bash
telnet smtppro.zoho.eu 465
```
You should see a response starting with `220`.

### To test with openssl:
```bash
echo "test" | openssl s_client -connect smtppro.zoho.eu:465
```

---

## Steps to Redeploy After Fixes

1. Make changes to code (which I've done)
2. Push to Git: `git push origin main`
3. Or manually trigger in Netlify:
   - Go to **Deploys**
   - Click **Trigger deploy** → **Deploy site**
4. Wait for green checkmark (usually 2-3 minutes)
5. Test the form again

---

## Still Stuck?

1. **Check browser console** for the exact error message
2. **Check Netlify function logs** for backend errors
3. **Screenshot the error** and share it
4. Look at the **error details** - it will tell you:
   - Is it a connection problem?
   - Is it an authentication problem?
   - Is it an email address problem?
   - Is it a network problem?

---

## What the Code Now Does

The improved error handling:

1. **Logs SMTP configuration** (without exposing passwords)
2. **Tests connection before sending** with proper error messaging
3. **Catches individual email send failures** 
4. **Includes detailed error codes** from the SMTP server
5. **Returns full error messages to frontend** (not just "Failed to send email")
6. **Logs everything with timestamps** for debugging
7. **Sets timeouts** to prevent hanging on network issues

