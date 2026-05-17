# Appendices

## A. Full Site Content (extracted from https://www.hindutemple.ie/)
> **Note:** The full copy of the site content is provided here for reference. Replace placeholder text with the actual copy when finalising.

### Home Page
```
Welcome to the Hindu Temple in Limerick – a place of worship, culture and community.
Our vision is to build a permanent Hindu Temple and Cultural Centre that serves present and future generations.
```

### About Page
```
Our mission is to serve the Hindu community in Ireland by providing a spiritual home, cultural education for children, and a venue for community gatherings and festivals.
```

### Events Page
```
Upcoming Events:
- Annual Navaratri Festival – Oct 2026
- Weekly Pooja Services – Mon, Wed, Fri
```

### Services Page
```
We offer:
- Daily Archana
- Special Occasion ceremonies
- Cultural workshops and classes
```

### Contact Page
```
Address: 4 Upper Denmark Street, Limerick
Email: info@hindutemple.ie
Phone: +353 123 4567
```

## B. Email Receipt Template (HTML)
```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Receipt</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;">
  <h2>Thank you for your {{type}}!</h2>
  <p>Dear {{memberName}},</p>
  <p>We have received your {{type}} of €{{amount}} on {{date}}.</p>
  <p>Transaction ID: {{transactionId}}</p>
  <p>Attached is your receipt.</p>
  <p>Best wishes,<br/>Hindu Temple Team</p>
</body>
</html>
```

## C. Glossary of Terms
| Term | Definition |
|------|------------|
| **CTA** | Call‑to‑Action – a button or link prompting the user to take a specific action |
| **RLS** | Row‑Level Security – Supabase feature to restrict data access per user role |
| **Edge Function** | Serverless function hosted by Supabase, executed close to the database |
| **Stripe Product** | Represents a membership or donation plan in Stripe |
| **Webhook** | HTTP callback from Stripe to notify our system of payment events |

---

*Generated on {{date}}*
