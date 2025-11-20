// server.js
// The New Holy Bible — Church of Axiom
// Express + Stripe one-page donation & subscription site
// Fixed initialization for Render deployment

// ----------------------
// Imports & App Setup
// ----------------------
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const stripeLib = require('stripe');

const app = express();
app.use(express.static('public'));
app.use('/static', express.static(__dirname));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ----------------------
// Environment Configuration
// ----------------------
const _RAW_DOMAIN = process.env.DOMAIN || 'http://localhost:3000';
const DOMAIN =
  _RAW_DOMAIN.startsWith('http://') || _RAW_DOMAIN.startsWith('https://')
    ? _RAW_DOMAIN
    : `https://${_RAW_DOMAIN}`;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const STRIPE_PRICE_MONTHLY_5 = process.env.STRIPE_PRICE_MONTHLY_5;

const stripe = stripeLib(STRIPE_SECRET_KEY);

// ----------------------
// Helper: Sanitize Amount
// ----------------------
function sanitizeAmountUsdToCents(input) {
  let amount = Number(input);
  if (!Number.isFinite(amount)) return null;
  amount = Math.round(amount * 100);
  if (amount < 100) return null;
  if (amount > 5_000_000) return null;
  return amount;
}

// ----------------------
// Routes
// ----------------------
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>The New Holy Bible — Church of Axiom</title>
  ...
</html>`);
});

// ----------------------
// Stripe API Endpoints
// ----------------------

// ✔ DONATION CHECKOUT
app.post('/create-checkout-session', async (req, res) => {
  try {
    const amountCents = sanitizeAmountUsdToCents(req.body.amountUsd);
    if (!amountCents) return res.status(400).json({ error: 'Invalid amount' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Donation to The New Holy Bible (Axiomatism)' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/#donate`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe payment error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ✔ MONTHLY SUBSCRIPTION
app.post('/create-subscription-session', async (req, res) => {
  try {
    if (!STRIPE_PRICE_MONTHLY_5)
      return res.status(500).json({ error: 'Monthly price not configured' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: STRIPE_PRICE_MONTHLY_5, quantity: 1 }],
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/#donate`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe subscription error:', err);
    res.status(500).json({ error: 'Failed to create subscription session' });
  }
});

// ----------------------
// ⭐ NEW ENDPOINT — Charge $23.95
// ----------------------
app.post('/pay-23', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'The New Holy Bible - Order' },
            unit_amount: 2395,
          },
          quantity: 1,
        }
      ],
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/cancel`
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe /pay-23 error:", err);
    res.status(500).json({ error: "Unable to create session" });
  }
});

// ----------------------
// ⭐ NEW ENDPOINT — Charge $33.95
// ----------------------
app.post('/pay-33', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'The New Holy Bible - Order' },
            unit_amount: 3395,
          },
          quantity: 1,
        }
      ],
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/cancel`
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe /pay-33 error:", err);
    res.status(500).json({ error: "Unable to create session" });
  }
});

// ----------------------
// Success Page
// ----------------------
app.get('/success', async (req, res) => {
  const { session_id } = req.query || {};
  let amountTotal = null;
  let isSubscription = false;
  try {
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      amountTotal = session.amount_total;
      isSubscription = session.mode === 'subscription';
    }
  } catch (e) {}
  const amountText = amountTotal
    ? `$${(amountTotal / 100).toFixed(2)}`
    : isSubscription
    ? '$5.00 / month'
    : 'your gift';

  res.type('html').send(`<html><body>
<h1>Thank You</h1>
<p>Your support (${amountText}) sustains our mission.</p>
<a href="/">Return Home</a>
</body></html>`);
});

// OPTIONAL CANCEL PAGE
app.get('/cancel', (req, res) => {
  res.send('<h1>Payment canceled.</h1>');
});

// ----------------------
// Start Server
// ----------------------
const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`The New Holy Bible server running on port ${port}`)
);
