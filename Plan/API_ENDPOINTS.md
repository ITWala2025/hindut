# API Design (Next.js API Routes / Vercel Functions)

## Authentication Middleware
All protected routes use the **Supabase JWT** passed via the `Authorization: Bearer <token>` header.
```js
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
  const supabase = createMiddlewareSupabaseClient({ req });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  // attach user to request for downstream handlers
  req.locals = { user };
  return NextResponse.next();
}
```

## Endpoints Overview
| Method | Path | Description | Auth | Returns |
|--------|------|-------------|------|---------|
| `GET` | `/api/memberships` | List memberships (filterable) | ✅ admin/editor | JSON array |
| `POST` | `/api/memberships` | Create a new membership (calls Stripe) | ✅ admin | Created object |
| `GET` | `/api/events` | Public list of events | ❌ public | JSON array |
| `POST` | `/api/events` | Create or update event | ✅ admin | Event object |
| `GET` | `/api/receipts/:id` | Retrieve receipt PDF URL | ✅ admin/editor (owner) | JSON |
| `POST` | `/api/stripe/webhook` | Stripe webhook handler | ❌ public (signature verified) | 200 OK |
| `POST` | `/api/media/upload` | Upload media to Supabase Storage | ✅ admin/editor | Uploaded file metadata |

## Example: Membership Creation (Server‑side)
```js
// pages/api/memberships/index.js
import { supabase } from '@/utils/supabaseClient';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { user } = req.locals; // set by auth middleware
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { memberId, plan } = req.body;
  // Map plan to Stripe product ID (defined in config)
  const productMap = {
    annual: process.env.STRIPE_PRODUCT_ANNUAL,
    semi_annual: process.env.STRIPE_PRODUCT_SEMI,
    monthly: process.env.STRIPE_PRODUCT_MONTHLY,
  };
  const productId = productMap[plan];
  if (!productId) return res.status(400).json({ error: 'Invalid plan' });

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: productId, quantity: 1 }],
    success_url: `${process.env.VERCEL_URL}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.VERCEL_URL}/membership/cancel`,
    client_reference_id: memberId,
  });

  // Store pending membership record
  const { data, error } = await supabase.from('memberships').insert({
    member_id: memberId,
    stripe_subscription_id: session.subscription,
    plan,
    status: 'pending',
    started_at: new Date(),
  });
  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json({ checkoutUrl: session.url });
}
```

## Example: Stripe Webhook Handler
```js
// pages/api/stripe/webhook.js
import Stripe from 'stripe';
import { supabase } from '@/utils/supabaseClient';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle relevant events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const memberId = session.client_reference_id;
      // Update membership status & store Stripe IDs
      await supabase.from('memberships')
        .update({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: 'active',
        })
        .eq('member_id', memberId);
      // Trigger receipt email (Vercel Function sendReceipt)
      await fetch(`${process.env.VERCEL_URL}/api/email/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, type: 'membership' }),
      });
      break;
    }
    case 'invoice.payment_failed': {
      // Update status to past_due
      const sub = event.data.object.subscription;
      await supabase.from('memberships')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', sub);
      break;
    }
    // Add other cases as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  res.json({ received: true });
}

// Helper to read raw body
async function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
```

## Error Handling Conventions
* Return JSON `{ error: 'Message' }` with appropriate HTTP status.
* Log full error stack to Vercel logs (`console.error`).
* For validation errors, use status `400` and include a `details` array.
* For authentication/authorization failures, use `401` or `403`.

---

*Generated on {{date}}*

