# Contact Form Email Setup Checklist

## ✅ What Has Been Implemented

### Backend
- [x] **contact-submit.ts** — Netlify function to handle contact form submissions
- [x] **contactEmailTemplate.ts** — Email template builders (HTML & plain text)
- [x] **SMTP Configuration** — Integrated nodemailer with Zoho SMTP
- [x] **Input Validation** — Zod schema for server-side validation
- [x] **Sanitization** — XSS/injection attack prevention
- [x] **Error Handling** — Comprehensive error messages and logging
- [x] **CORS Support** — Cross-origin request handling

### Frontend
- [x] **Contact Form Integration** — Updated to call backend function
- [x] **Loading State** — Button shows "Sending..." during submission
- [x] **Error Handling** — User-friendly error messages via toast notifications
- [x] **Form Clearing** — Auto-clear on successful submission
- [x] **Field Validation** — Client-side validation before sending

### Email Features
- [x] **Visitor Confirmation** — Beautiful HTML email with message summary
- [x] **Admin Notification** — Detailed admin email with full submission info
- [x] **Email Templates** — Professional, branded email templates
- [x] **Plain Text Fallback** — For email clients without HTML support

---

## 🚀 Next Steps: Netlify Environment Configuration

You **MUST** do this for the system to work:

### 1. Go to Netlify Dashboard
```
1. Open: https://app.netlify.com
2. Navigate to: Your Site → Settings → Build & deploy → Environment
```

### 2. Add These Environment Variables

| Key | Value |
|-----|-------|
| `SMTP_HOST` | `smtppro.zoho.eu` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `donation@hindutemple.ie` |
| `SMTP_PASS` | `Haidonation2026$` |
| `EMAIL_FROM` | `"HAI Donations <donation@hindutemple.ie>"` |
| `CONTACT_ADMIN_EMAIL` | `info@hindutemple.ie` |

### 3. Trigger a Redeploy
```
Dashboard → Deploys → Trigger deploy
```

---

## ✨ What Happens Now

### User Submits Contact Form
1. Form data is validated (client-side)
2. Submitted to `/.netlify/functions/contact-submit`
3. Server validates and sanitizes
4. **Two emails are sent:**
   - ✉️ Confirmation to visitor (from `donation@hindutemple.ie`)
   - ✉️ Admin notification to `info@hindutemple.ie`
5. User sees success message
6. Form clears automatically

### Email Recipients
- **Visitor gets**: Confirmation that we received their message
- **Admin gets**: Full details to respond to visitor

---

## 🧪 How to Test

### After Deploying (5 minutes)
1. Visit: https://limerickhindutemple.netlify.app/contact
2. Fill out the contact form with:
   - Name: Your name
   - Email: Your email
   - Phone: (optional) Your phone
   - Subject: Test message
   - Message: This is a test submission from the contact form

3. Click "Send Message"
4. Check your email inbox for confirmation
5. Check `info@hindutemple.ie` inbox for admin notification

### Troubleshooting
- **No email received?** → Check Netlify function logs (Dashboard → Functions → contact-submit)
- **Error on form?** → Check browser console for error details
- **Email in spam?** → Check spam folder and mark as not spam

---

## 📝 Important Notes

### Security
✅ All inputs are sanitized to prevent XSS attacks
✅ Valid email format is enforced
✅ Message length is limited to 5000 characters
✅ CORS protection enabled

### Email Configuration
- From email: `donation@hindutemple.ie` (using your Zoho account)
- Admin notification sent to: `info@hindutemple.ie`
- Response time: 24-48 hours (as per email template)

### Files Created/Modified
```
Created:
  - netlify/functions/contact-submit.ts
  - netlify/functions/lib/contactEmailTemplate.ts
  - CONTACT_FORM_SETUP.md (this documentation)

Modified:
  - src/components/pages/ContactPage.tsx
```

---

## 🔧 API Endpoint

**POST** `/.netlify/functions/contact-submit`

**Request Body** (JSON):
```json
{
  "name": "Your Name",
  "email": "your.email@example.com",
  "phone": "+353 87 123 4567",
  "subject": "Subject of inquiry",
  "message": "Your detailed message..."
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Your message has been received. We will respond shortly.",
  "reference": "CONTACT-1718304500000"
}
```

---

## ⚠️ Before You Go Live

- [ ] Add all 7 environment variables to Netlify
- [ ] Verify `donation@hindutemple.ie` is active in Zoho Mail
- [ ] Test form submission (see testing section above)
- [ ] Verify both confirmation and admin emails are received
- [ ] Check email spam folders
- [ ] Confirm response times match template (24-48 hours)

---

## 📚 Documentation Files

- **CONTACT_FORM_SETUP.md** — Complete setup guide with all details
- **netlify/functions/contact-submit.ts** — Function source code with comments
- **netlify/functions/lib/contactEmailTemplate.ts** — Email template source

---

## 💡 What You Can Do Next

### Optional Enhancements (Future)
- Add database to store all contact submissions
- Add rate limiting to prevent spam
- Add file attachment support
- Create admin dashboard to view submissions
- Add CAPTCHA verification
- Multi-language support
- Automatic "out of office" auto-reply

### Monitoring
- Check function logs weekly for errors
- Monitor delivery success rate
- Update admin email if needed
- Test monthly with a real submission

---

## ❓ FAQ

**Q: Will the email be sent from `donation@hindutemple.ie`?**
A: Yes, that's the configured sender email. Recipients will see it as from "HAI Donations <donation@hindutemple.ie>".

**Q: What if someone submits the form with invalid email?**
A: The form will show an error: "Invalid email address" and won't send.

**Q: How long do emails take to arrive?**
A: Usually 1-2 minutes. Check spam folder if not in inbox after 5 minutes.

**Q: Can I change the admin email later?**
A: Yes! Just update `CONTACT_ADMIN_EMAIL` in Netlify dashboard (no redeploy needed).

**Q: What if someone submits spam/inappropriate content?**
A: All submissions are stored in your email. You can delete them and consider adding CAPTCHA.

**Q: Is form data stored in a database?**
A: No, only in your email. Consider adding database storage if needed for audit trail.

---

## 🎯 Quick Start (TL;DR)

1. Open Netlify dashboard
2. Go to Settings → Build & deploy → Environment
3. Add the 7 environment variables (from the table above)
4. Trigger a redeploy
5. Test at https://limerickhindutemple.netlify.app/contact
6. Done! 🎉

---

**Created**: 2026-06-12
**Status**: ✅ Ready to Deploy
**Next Action**: Add environment variables to Netlify
