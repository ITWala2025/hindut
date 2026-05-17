# Public Site Specification

## Page List & Primary CTA Placement

| Page | URL Path | Primary CTA | CTA Placement |
|------|----------|------------|---------------|
| Home | `/` | **Membership** | Hero banner, top‑right button |
| About | `/about` | **Donate** | Sidebar sticky button |
| Events | `/events` | **Volunteer** | End of event list card |
| Services | `/services` | **Membership** | Hero section below headline |
| Contact | `/contact` | **Donate** | Footer CTA |

### CTA Details (SEO & Schema.org)
*All CTA buttons must include appropriate `aria-label` and `data-gtm` attributes for analytics.*

#### Membership CTA
```html
<a href="/membership" class="btn btn-primary" aria-label="Become a member" data-gtm="cta_membership">
  Become a Member
</a>
```
*Schema.org*: `Offer` with `priceSpecification` referencing Stripe product IDs.

#### Donate CTA
```html
<a href="/donate" class="btn btn-secondary" aria-label="Donate now" data-gtm="cta_donate">
  Donate
</a>
```
*Schema.org*: `DonateAction` linked to `PaymentMethod` Stripe.

#### Volunteer CTA
```html
<a href="/volunteer" class="btn btn-outline" aria-label="Volunteer with us" data-gtm="cta_volunteer">
  Volunteer
</a>
```
*Schema.org*: `VolunteerAction`.

## Stripe Integration

### Membership Plans (match Stripe product IDs)
| Plan | Duration | Price (€) | Stripe Product ID |
|------|----------|-----------|-------------------|
| Annual | 1 year | 20 | `prod_annual_membership` |
| Semi‑Annual | 6 months | 12 | `prod_semi_annual` |
| Monthly | 1 month | 4 | `prod_monthly` |

### Donation Flow
* One‑time: amount entered by user, creates a Stripe `Price` on‑the‑fly.
* Recurring: select from preset tiers (e.g., €22, €35, €50) linked to Stripe `Price` objects.

### Webhook Handling (Vercel Functions)
* Endpoint: `/api/stripe/webhook`
* Listens for `checkout.session.completed`, `invoice.payment_failed`, `charge.refunded`.
* Verifies signature using `STRIPE_WEBHOOK_SECRET`.
* Updates Supabase tables (`memberships`, `donations`) and triggers email receipt.

### Email Receipt (SendGrid via Vercel Function)
* Template stored in `templates/email/receipt.html` (see Appendices).
* Function `sendReceipt` receives payload `{ to, subject, html }` and calls SendGrid API.
* Called from webhook after successful payment.

## Media Galleries
* **Photo Gallery** – Supabase Storage bucket `public-gallery`. Images are lazy‑loaded using `next/image` with `loading="lazy"`.
* **Video Gallery** – Hosted on Supabase bucket `videos`; streamed via signed URLs (valid 1 hour).
* Each media item includes SEO `alt` text and Open Graph `og:image` tags generated at build time.

## SEO Requirements
* Every page includes a `<Head>` component with:
  * `title` – unique, ≤ 60 chars.
  * `meta name="description"` – ≤ 160 chars.
  * `link rel="canonical"` – absolute URL.
  * Structured data (`application/ld+json`) for `WebPage`, `Organization`, and page‑specific schema (`Event`, `Service`, `DonateAction`).
* Sitemap generation script `scripts/generate-sitemap.js` runs on `postbuild` and uploads `sitemap.xml` to Supabase bucket `public-sitemap`.

## UI Wireframes (ASCII)

### Home Page
```
+---------------------------------------------------+
| LOGO          | Nav Links | Language Switcher    |
+---------------------------------------------------+
| HERO IMAGE with Membership CTA (center)          |
|   "Join Our Temple Community"   [Become Member] |
+---------------------------------------------------+
| About snippet | Upcoming Events (carousel)      |
+---------------------------------------------------+
| Services Overview | Latest Blog Posts            |
+---------------------------------------------------+
| Footer with Donate & Volunteer CTAs               |
+---------------------------------------------------+
```

### Events Page
```
+---------------------------------------------------+
| Event Card (image, title, date)   [Volunteer]    |
|---------------------------------------------------|
| Event Card (image, title, date)   [Buy Ticket]   |
|---------------------------------------------------|
| Filter bar (All / Free / Paid)                    |
+---------------------------------------------------+
```

*All wireframes are simplified; actual UI should follow Tailwind design system defined in `styles/tailwind.config.js`.*

---

*Generated on {{date}}*

