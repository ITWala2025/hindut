# Payment Gateway Setup Guide

This guide will help you set up PayPal, Stripe, and SumUp payment gateways for the Hindu Association of Ireland donation system.

## Overview

The donation modal supports three payment gateways:
- **PayPal**: Real-time payment processing with PayPal buttons
- **Stripe**: Redirect to Stripe Checkout for secure payment
- **SumUp**: Simulated checkout (requires custom API integration)

## Prerequisites

1. Node.js installed
2. Access to payment gateway dashboards
3. Business verification completed with payment providers

---

## PayPal Setup

### 1. Create a PayPal Business Account
- Go to [PayPal Developer](https://developer.paypal.com/)
- Sign in or create an account
- Navigate to Dashboard

### 2. Create an App
1. Click "My Apps & Credentials"
2. Click "Create App"
3. Enter app name (e.g., "Hindu Association of Ireland Donations")
4. Select "Merchant" as app type
5. Click "Create App"

### 3. Get Credentials
- Copy your **Client ID** from the app details page
- For live payments, switch to "Live" mode and get live credentials

### 4. Configure Environment
Add to your `.env` file:
```bash
VITE_PAYPAL_CLIENT_ID=your_live_client_id_here
```

### 5. Test the Integration
- Use sandbox mode for testing: Create test accounts in PayPal Developer Dashboard
- For sandbox, use sandbox Client ID
- For production, use live Client ID

**PayPal Documentation**: https://developer.paypal.com/docs/checkout/

---

## Stripe Setup

### 1. Create a Stripe Account
- Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- Sign up or log in
- Complete business verification

### 2. Get API Keys
1. Navigate to Developers → API Keys
2. Copy your **Publishable Key** (starts with `pk_`)
3. Keep your Secret Key secure (never expose in frontend)

### 3. Configure Environment
Add to your `.env` file:
```bash
VITE_STRIPE_PUBLIC_KEY=pk_test_your_key_here
```

### 4. Set Up Backend API (Required)

The current implementation requires a backend endpoint to create Checkout Sessions.

#### Example Backend Setup (Node.js/Express)

```javascript
// backend/server.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  const { amount, email, name } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Temple Donation',
              description: `Donation from ${name}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/donation/cancel`,
      customer_email: email,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Server running on port 3001'));
```

#### Update Frontend Code

Modify `handleStripePayment` in `DonationDialog.tsx`:

```typescript
const handleStripePayment = async () => {
  setIsProcessing(true)
  try {
    const stripe = await stripePromise
    if (!stripe) throw new Error('Stripe failed to load')

    // Call your backend to create a Checkout Session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: getDonationAmount(),
        email: donorEmail,
        name: donorName,
      }),
    })

    const { sessionId } = await response.json()

    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({ sessionId })

    if (result.error) {
      toast.error(result.error.message)
    }
  } catch (error) {
    toast.error('Payment failed. Please try again.')
  } finally {
    setIsProcessing(false)
  }
}
```

### 5. Set Up Webhooks (Recommended)

1. Go to Developers → Webhooks in Stripe Dashboard
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook signing secret

**Stripe Documentation**: https://stripe.com/docs/payments/checkout

---

## SumUp Setup

### 1. Create a SumUp Account
- Go to [SumUp Developer Portal](https://developer.sumup.com/)
- Sign up and complete business verification

### 2. Get API Credentials
1. Create an application in the developer portal
2. Get your API keys (Client ID and Client Secret)
3. Set up OAuth flow for merchant authorization

### 3. Configure Environment
Add to your `.env` file:
```bash
VITE_SUMUP_CLIENT_ID=your_sumup_client_id_here
```

### 4. Implement Backend Integration

SumUp requires server-side integration for checkout creation:

```javascript
// backend/sumup.js
const axios = require('axios');

async function createSumUpCheckout(amount, email, description) {
  const accessToken = await getSumUpAccessToken(); // Implement OAuth flow

  const response = await axios.post(
    'https://api.sumup.com/v0.1/checkouts',
    {
      checkout_reference: `donation_${Date.now()}`,
      amount: amount,
      currency: 'USD',
      pay_to_email: process.env.SUMUP_MERCHANT_EMAIL,
      description: description,
      redirect_url: `${process.env.FRONTEND_URL}/donation/success`,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.id; // Checkout ID
}
```

### 5. Update Frontend

Modify `handleSumUpPayment` in `DonationDialog.tsx`:

```typescript
const handleSumUpPayment = async () => {
  setIsProcessing(true)
  try {
    const response = await fetch('/api/create-sumup-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: getDonationAmount(),
        email: donorEmail,
        description: `Donation from ${donorName}`,
      }),
    })

    const { checkoutId } = await response.json()

    // Redirect to SumUp checkout
    window.location.href = `https://api.sumup.com/v0.1/checkouts/${checkoutId}`
  } catch (error) {
    toast.error('Payment failed. Please try again.')
  } finally {
    setIsProcessing(false)
  }
}
```

**SumUp Documentation**: https://developer.sumup.com/docs/

---

## Testing

### Test Cards for Development

#### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expires: Any future date
- CVC: Any 3 digits

#### PayPal Sandbox
- Create test buyer accounts in PayPal Developer Dashboard
- Use sandbox credentials for testing

### Demo Mode

The current implementation works in demo mode without real API keys:
- PayPal will show a demo error (add real Client ID to fix)
- Stripe simulates the checkout flow
- SumUp simulates the checkout flow

---

## Security Best Practices

1. **Never expose secret keys in frontend code**
   - Only use publishable keys in the frontend
   - Keep secret keys in backend environment variables

2. **Use HTTPS in production**
   - Payment gateways require secure connections

3. **Validate payments server-side**
   - Don't trust frontend payment confirmations
   - Verify via webhooks or API calls

4. **Store donation records**
   - Save payment details in your database
   - Track transaction IDs for reconciliation

5. **Handle errors gracefully**
   - Show user-friendly error messages
   - Log errors for debugging

---

## Going Live

### Pre-Launch Checklist

- [ ] Complete business verification with all payment providers
- [ ] Switch from test to live API keys
- [ ] Set up production backend API
- [ ] Configure webhook endpoints
- [ ] Test payment flows end-to-end
- [ ] Set up payment receipt emails
- [ ] Configure payment failure notifications
- [ ] Add terms and conditions
- [ ] Set up refund policy
- [ ] Test on multiple devices and browsers

### Environment Variables for Production

Create a `.env.production` file:
```bash
VITE_PAYPAL_CLIENT_ID=your_live_paypal_client_id
VITE_STRIPE_PUBLIC_KEY=pk_live_your_live_stripe_key
VITE_SUMUP_CLIENT_ID=your_live_sumup_client_id
```

---

## Support

For issues with specific payment gateways:
- **PayPal**: https://developer.paypal.com/support/
- **Stripe**: https://support.stripe.com/
- **SumUp**: https://developer.sumup.com/support/

For general implementation questions, refer to the official documentation for each provider.
