// server.js
// Simple single‑page site for thenewholybible.com, deployable on Render, with Stripe Checkout
// Features:
//  - One clean landing page (served from this server)
//  - Preset donations ($25, $50, $100) + custom amount
//  - Monthly subscription ($5/mo) via a predefined Stripe Price ID
//  - Success page
//  - Social links + link to scripture
//  - Ready for Render: set env vars in dashboard
//
// ENV VARS (configure in Render → your Web Service → Environment):
//  STRIPE_SECRET_KEY             (required) — find in Stripe Dashboard → Developers → API keys
//  STRIPE_PRICE_MONTHLY_5        (required) — create a $5/month Price in Stripe and paste the Price ID (e.g., price_123...)
//  DOMAIN                        (required) — public base URL, e.g., https://thenewholybible.com (use Render URL during testing)
//  PORT                          (Render provides this automatically)
//
// Optional (for future webhooks — not required for first launch):
//  STRIPE_WEBHOOK_SECRET         (optional for now)

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// --- Configuration & Stripe ---
const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_MONTHLY_5 = process.env.STRIPE_PRICE_MONTHLY_5; // e.g., price_abc123

if (!STRIPE_SECRET_KEY) {
  console.warn('\n[WARN] STRIPE_SECRET_KEY is not set. Set it in Render → Environment.');
}
if (!STRIPE_PRICE_MONTHLY_5) {
  console.warn('\n[WARN] STRIPE_PRICE_MONTHLY_5 is not set. Create a $5/m Price in Stripe and set its Price ID.');
}

const stripe = require('stripe')(STRIPE_SECRET_KEY || 'sk_test_placeholder');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ---- Helpers ----
function sanitizeAmountUsdToCents(input) {
  // Accept dollars (string/number), min $1.00, max $50,000 for safety
  let amount = Number(input);
  if (!Number.isFinite(amount)) return null;
  amount = Math.round(amount * 100); // to cents
  if (amount < 100) return null; // $1 minimum
  if (amount > 5_000_000) return null; // $50,000 max
  return amount;
}

// ---- Routes ----
app.get('/', (req, res) => {
  // One-page HTML. Uses Tailwind via CDN. Stripe handled via Checkout redirects.
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The New Holy Bible — Aciomatism</title>
  <meta name="description" content="Aciomatism — The Book of Axiom. A movement for reason, compassion, and education." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
    .glass { backdrop-filter: blur(8px); background: rgba(255, 255, 255, 0.75); }
  </style>
</head>
<body class="bg-gradient-to-b from-slate-50 to-slate-200 text-slate-800">
  <header class="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-full bg-slate-900"></div>
      <div>
        <div class="text-xl font-extrabold tracking-tight">The New Holy Bible</div>
        <div class="text-sm text-slate-500">Aciomatism · The Book of Axiom</div>
      </div>
    </div>
    <nav class="hidden md:flex items-center gap-6 text-sm">
      <a href="#mission" class="hover:underline">Mission</a>
      <a href="#scripture" class="hover:underline">Scripture</a>
      <a href="#donate" class="hover:underline">Donate</a>
      <a href="#connect" class="hover:underline">Connect</a>
    </nav>
  </header>

  <main>
    <!-- Hero -->
    <section class="max-w-5xl mx-auto px-6 py-16 md:py-24">
      <div class="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 class="text-4xl md:text-5xl font-extrabold leading-tight">The Word is Clarity. The Work is Compassion.</h1>
          <p class="mt-5 text-lg text-slate-600">Aciomatism calls us to reason and mercy: to teach, to build schools, to serve in charity, and to spread the Word of God set forth in <em>The Book of Axiom</em>.</p>
          <div class="mt-7 flex flex-wrap gap-3">
            <a href="#donate" class="inline-block px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold shadow hover:opacity-90">Support the Mission</a>
            <a href="#scripture" class="inline-block px-5 py-3 rounded-xl bg-white border border-slate-300 font-semibold hover:bg-slate-50">Read the Scripture</a>
          </div>
        </div>
        <div class="glass rounded-3xl p-8 shadow-xl">
          <blockquote class="text-slate-700">
            <p class="text-xl font-semibold">“If the Word of God has stirred within you, and you wish to help it reach others, visit the Temple of Exum. Every offering sustains the work of clarity, reason, and compassion. For as God gives to all, so may each give according to truth.”</p>
            <footer class="mt-4 text-sm text-slate-500">— The Book of Exum, Benediction</footer>
          </blockquote>
        </div>
      </div>
    </section>

    <!-- Mission -->
    <section id="mission" class="bg-white/70 py-16">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-2xl md:text-3xl font-extrabold">Our Mission</h2>
        <p class="mt-4 text-slate-700 leading-relaxed">To build where ignorance once stood: to spread the Word of God, to found a church where truth is worship, to raise schools where knowledge and compassion grow together, and to labor in charity so that wisdom is known through kindness as well as knowledge.</p>
      </div>
    </section>

    <!-- Scripture / Links -->
    <section id="scripture" class="py-16">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-2xl md:text-3xl font-extrabold">Scripture & Channels</h2>
        <p class="mt-4 text-slate-700">Explore <em>The Book of Axiom</em> and follow our channels to share the Word of God.</p>
        <div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a class="block p-5 border rounded-xl bg-white hover:bg-slate-50" href="https://youtube.com/" target="_blank" rel="noopener">YouTube Channel →</a>
          <a class="block p-5 border rounded-xl bg-white hover:bg-slate-50" href="https://instagram.com/" target="_blank" rel="noopener">Instagram →</a>
          <a class="block p-5 border rounded-xl bg-white hover:bg-slate-50" href="#" target="_blank" rel="noopener">Read The Book of Axiom (PDF) →</a>
        </div>
      </div>
    </section>

    <!-- Donate -->
    <section id="donate" class="bg-white/70 py-16">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-2xl md:text-3xl font-extrabold">Donate</h2>
        <p class="mt-4 text-slate-700">Your support sustains our charitable work and education initiatives. Choose a preset or enter an amount, then complete your secure payment via Stripe.</p>

        <!-- Presets -->
        <div class="mt-6 flex flex-wrap gap-3">
          <button data-amount="25" class="preset px-4 py-2 rounded-xl border bg-white hover:bg-slate-50">$25</button>
          <button data-amount="50" class="preset px-4 py-2 rounded-xl border bg-white hover:bg-slate-50">$50</button>
          <button data-amount="100" class="preset px-4 py-2 rounded-xl border bg-white hover:bg-slate-50">$100</button>
        </div>

        <!-- Custom amount form -->
        <form id="donation-form" class="mt-4 flex gap-3 items-center">
          <label class="text-slate-700">Custom amount (USD)</label>
          <input id="donation-amount" type="number" min="1" step="1" placeholder="e.g., 250" class="w-40 px-3 py-2 rounded-xl border" />
          <button id="donate-button" type="submit" class="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:opacity-90">Donate with Card</button>
        </form>

        <hr class="my-10" />

        <!-- Subscription -->
        <h3 class="text-xl font-bold">Join the Daily Prayer — $5/month</h3>
        <p class="mt-2 text-slate-700">Receive a daily prayer or sermon by email. Cancel anytime.</p>
        <button id="subscribe-button" class="mt-4 px-5 py-2 rounded-xl bg-white border font-semibold hover:bg-slate-50">Subscribe $5/mo</button>
        <p class="mt-3 text-xs text-slate-500">Handled securely by Stripe Checkout.</p>
      </div>
    </section>

    <!-- Connect -->
    <section id="connect" class="py-16">
      <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-2xl md:text-3xl font-extrabold">Stay Connected</h2>
        <p class="mt-4 text-slate-700">Questions, volunteering, or partnership for schools and charity? Email <a class="underline" href="mailto:contact@thenewholybible.com">contact@thenewholybible.com</a>.</p>
      </div>
    </section>
  </main>

  <footer class="py-10 text-center text-sm text-slate-500">
    <p>© <span id="year"></span> The New Holy Bible · Aciomatism</p>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();

    // Preset donation buttons → set the input value and submit
    document.querySelectorAll('.preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = btn.getAttribute('data-amount');
        const input = document.getElementById('donation-amount');
        input.value = amt;
        document.getElementById('donation-form').dispatchEvent(new Event('submit'));
      });
    });

    // Custom donation submit → POST to server to create Checkout Session
    document.getElementById('donation-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById('donation-amount').value || '0');
      if (!Number.isFinite(amount) || amount < 1) {
        alert('Please enter a valid amount (minimum $1).');
        return;
      }
      try {
        const res = await fetch('/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountUsd: amount })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('Unable to start checkout.');
        }
      } catch (err) {
        alert('Network error starting checkout.');
      }
    });

    // Subscription button → POST to server to create Subscription Checkout
    document.getElementById('subscribe-button').addEventListener('click', async () => {
      try {
        const res = await fetch('/create-subscription-session', { method: 'POST' });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('Unable to start subscription checkout.');
        }
      } catch (err) {
        alert('Network error starting subscription.');
      }
    });
  </script>
</body>
</html>`);
});

// Create a Stripe Checkout Session for a one‑time donation
app.post('/create-checkout-session', async (req, res) => {
  try {
    const amountCents = sanitizeAmountUsdToCents(req.body.amountUsd);
    if (!amountCents) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to The New Holy Bible (Aciomatism)',
              description: 'Charity, education, and the spread of the Word of God',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/#donate`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe payment session error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create a Stripe Checkout Session for the $5/month subscription
app.post('/create-subscription-session', async (req, res) => {
  try {
    if (!STRIPE_PRICE_MONTHLY_5) {
      return res.status(500).json({ error: 'Monthly price not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: STRIPE_PRICE_MONTHLY_5, quantity: 1 },
      ],
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/#donate`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe subscription session error:', err);
    return res.status(500).json({ error: 'Failed to create subscription session' });
  }
});

// Simple success page
app.get('/success', async (req, res) => {
  const { session_id } = req.query || {};
  let amountTotal = null;
  let isSubscription = false;
  try {
    if (session_id && STRIPE_SECRET_KEY) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      amountTotal = session.amount_total; // cents for one‑time payments; null for subs
      isSubscription = session.mode === 'subscription';
    }
  } catch (e) {
    // ignore failure here — still show thank you
  }

  const amountText = amountTotal ? `$${(amountTotal / 100).toFixed(2)}` : (isSubscription ? '$5.00 / month' : 'your gift');

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Thank You — The New Holy Bible</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800">
  <main class="max-w-2xl mx-auto px-6 py-24 text-center">
    <h1 class="text-4xl font-extrabold">Thank You</h1>
    <p class="mt-4 text-lg">Your support (${amountText}) sustains our mission of education, charity, and the spread of the Word of God.</p>
    <a href="/" class="inline-block mt-8 px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold">Return Home</a>
  </main>
</body>
</html>`);
});

// (Optional) Webhook endpoint stub for future automation (email receipts, etc.)
// Uncomment, set STRIPE_WEBHOOK_SECRET in Render, and configure Stripe Dashboard → Webhooks → add endpoint `${DOMAIN}/webhook`
/*
const rawBodyBuffer = (req, res, buf) => { if (req.originalUrl.startsWith('/webhook')) req.rawBody = buf; };
app.use(bodyParser.json({ verify: rawBodyBuffer }));
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }
  // Handle events (checkout.session.completed, invoice.paid, etc.)
  console.log('Webhook event:', event.type);
  res.sendStatus(200);
});
*/

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`The New Holy Bible server running on port ${port}`);
});
