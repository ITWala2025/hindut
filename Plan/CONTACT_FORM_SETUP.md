# Contact Form Email Setup Guide

## Overview
The contact form now sends emails using Zoho SMTP. When a visitor submits the contact form, two emails are sent:
1. **Confirmation email** to the visitor (from `donation@hindutemple.ie`)
2. **Admin notification** to your team email with the full submission details

---

## Zoho SMTP Configuration

### Step 1: Zoho Mail Setup
Since you're using Zoho Mail, you already have:
- **Email Account**: `donation@hindutemple.ie`
- **Password**: `Haidonation2026$`

### Step 2: Zoho Mail SMTP Settings

Choose the appropriate SMTP server based on your region:

#### **For EU/Ireland (Recommended)**
```
SMTP Host:   smtppro.zoho.eu
SMTP Port:   465
Secure:      true (SSL)
```

#### **For Worldwide**
```
SMTP Host:   smtppro.zoho.com
SMTP Port:   465
Secure:      true (SSL)
```

---

## Environment Variables Setup

### Add to Netlify Environment Variables

Go to **Netlify Dashboard → Settings → Build & deploy → Environment**

Add the following variables:

```
SMTP_HOST=smtppro.zoho.eu
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=donation@hindutemple.ie
SMTP_PASS=Haidonation2026$
EMAIL_FROM=donation@hindutemple.ie
CONTACT_ADMIN_EMAIL=community@hindutemple.ie
```

### Variable Explanations

| Variable | Value | Description |
|----------|-------|-------------|
| `SMTP_HOST` | `smtppro.zoho.eu` or `smtppro.zoho.com` | Zoho's SMTP server |
| `SMTP_PORT` | `465` | SSL port |
| `SMTP_SECURE` | `true` | Use SSL (not STARTTLS) |
| `SMTP_USER` | `donation@hindutemple.ie` | Your Zoho email account |
| `SMTP_PASS` | `Haidonation2026$` | Your Zoho email password |
| `EMAIL_FROM` | `"HAI Donations <donation@hindutemple.ie>"` | Display name and sender email |
| `CONTACT_ADMIN_EMAIL` | `community@hindutemple.ie` | Where admin notifications are sent |

---

## Netlify Configuration

The project already has Netlify functions configured in `netlify.toml`:

```toml
[functions]
  directory       = "netlify/functions"
  node_bundler    = "esbuild"
  included_files  = ["netlify/functions/lib/**"]
```

**Note**: The `contact-submit` function will automatically be deployed with your site.

---

## What Happens After Form Submission

### User Experience
1. User fills out contact form on `/contact`
2. Clicks "Send Message" button
3. Form validates on client-side
4. Submission is sent to `/.netlify/functions/contact-submit`
5. Backend validates and sanitizes input
6. Two emails are sent via Zoho SMTP:
   - Confirmation to visitor
   - Admin notification to team
7. User sees success message: "Thank you for your message! We will get back to you soon."
8. Form clears automatically

### Error Handling
If email sending fails:
- User is shown a specific error message
- The form does NOT clear
- User can retry submission
- Backend logs the error for debugging

---

## Email Templates

### Visitor Confirmation Email
- **Subject**: "We received your message – Hindu Association of Ireland"
- **From**: `donation@hindutemple.ie`
- **Contents**: 
  - Greeting with visitor's name
  - Echo of their submitted message
  - Reassurance about response time (24-48 hours)
  - Organization contact details
  - Call to action for urgent matters

### Admin Notification Email
- **Subject**: "New Contact Form Submission from [Visitor Name]"
- **To**: `community@hindutemple.ie` (or `CONTACT_ADMIN_EMAIL`)
- **From**: `donation@hindutemple.ie`
- **Contents**:
  - Visitor's name, email, phone
  - Submission timestamp
  - Subject and full message
  - Quick reply link
  - Reply-to set to visitor's email

---

## Security Features

The contact form includes security measures:

1. **Input Validation**
   - Name: 2-200 characters
   - Email: Valid email format
   - Subject: 5-200 characters
   - Message: 10-5000 characters
   - Phone: Optional, validated if provided

2. **Sanitization**
   - All text inputs are sanitized to prevent XSS attacks
   - HTML special characters are escaped
   - Input length limits prevent buffer overflows

3. **CORS Protection**
   - Same-origin requests preferred
   - CORS headers configured for Netlify

---

## Testing the Setup

### Local Testing (Before Deployment)

1. **Verify environment variables are set**:
   - In `netlify.toml` or local `.env` file
   - Or through Netlify dashboard

2. **Test function locally** (if using Netlify CLI):
   ```bash
   netlify dev
   ```
   - Navigate to http://localhost:8888/contact
   - Fill out and submit the form
   - Check console for success message

### Production Testing (After Deployment)

1. Visit: https://limerickhindutemple.netlify.app/contact
2. Submit a test message
3. Check both:
   - Your inbox (confirmation)
   - Admin email (notification)
4. Verify both emails arrive within 1-2 minutes

### Troubleshooting

**Emails not arriving?**
- Check SMTP credentials in Netlify dashboard
- Verify `CONTACT_ADMIN_EMAIL` is set
- Check Zoho Mail spam folder
- Verify Zoho Mail is active and credentials are correct

**Form shows error?**
- Check browser console for error messages
- Check Netlify function logs: Dashboard → Functions → contact-submit
- Verify all required environment variables are set

**Function deployment issues?**
- Ensure `netlify.toml` has `included_files = ["netlify/functions/lib/**"]`
- Rebuild site: Dashboard → Deploys → Trigger deploy

---

## File Changes Made

### New Files Created
- `netlify/functions/contact-submit.ts` — Main handler function
- `netlify/functions/lib/contactEmailTemplate.ts` — Email templates

### Files Updated
- `src/components/pages/ContactPage.tsx` — Added form submission logic

---

## API Reference

### POST /.netlify/functions/contact-submit

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+353 87 123 4567",
  "subject": "Inquiry about Diwali event",
  "message": "I would like to know more about the upcoming Diwali celebration..."
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Your message has been received. We will respond shortly.",
  "reference": "CONTACT-1718304500000"
}
```

**Error Response (400/500)**:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name must be at least 2 characters"
    }
  ]
}
```

---

## Maintenance & Monitoring

### Monitoring Email Delivery
1. Check Zoho Mail sent folder: `donation@hindutemple.ie` account
2. Monitor Netlify function logs for errors
3. Test monthly with a real submission

### Updating Sender Email
If you need to change the sender email later:
1. Update `SMTP_USER` and `EMAIL_FROM` in Netlify environment variables
2. Redeploy the site (automatic or manual)
3. Test with a form submission

### Changing Admin Email
To change where admin notifications are sent:
1. Update `CONTACT_ADMIN_EMAIL` in Netlify environment variables
2. No redeployment needed (takes effect immediately)
3. Test by submitting a form

---

## Additional Notes

- **Email Rate Limiting**: No rate limiting is currently implemented. Consider adding if you expect high volume.
- **Email Storage**: Emails are sent through Zoho but not stored in the application database. Consider adding a database record if you need to archive submissions.
- **Attachments**: The current implementation doesn't support file uploads. This could be added in future updates.
- **Multi-language Support**: Currently templates are in English only.

---

## Support & Debugging

If you encounter issues:

1. **Check Netlify Function Logs**:
   - Dashboard → Site → Functions → contact-submit
   - Look for error messages with timestamps

2. **Check Email Deliverability**:
   - Zoho Mail dashboard → Sent folder
   - Verify emails are being sent

3. **Test Credentials**:
   - Verify credentials work by logging into Zoho Mail webmail
   - Ensure 2FA (if enabled) doesn't block SMTP

4. **Browser Console**:
   - Open DevTools → Console
   - Submit form and check for JavaScript errors

---

## Next Steps (Optional Enhancements)

- [ ] Add database storage of submissions for records
- [ ] Implement rate limiting to prevent spam
- [ ] Add file attachment support
- [ ] Create admin dashboard to view submissions
- [ ] Add automatic email replies at set intervals
- [ ] Implement CAPTCHA to prevent bot submissions
- [ ] Add multi-language email templates
- [ ] Create email notification to admin with submission count/summary

