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

// serve /public AND also this folder (so 1.png,2.png,3.png next to server.js work)
app.use(express.static('public'));
app.use('/assets', express.static(__dirname));

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
  <meta name="description" content="The Church of Axiom — a Christian movement dedicated to spreading knowledge and the Word of God, especially where it is most needed." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            parchment: '#fbf7ef',
            ink: '#1f2937',
            gold: { 300:'#f1e2b6', 400:'#e5c96b', 500:'#d4af37', 600:'#b89022' }
          },
          backgroundImage: {
            halo: 'radial-gradient(80% 60% at 50% -10%, rgba(212,175,55,.25), rgba(255,255,255,0) 70%)',
            parchment: 'linear-gradient(180deg,#ffffff,#fbf7ef 55%,#f6efe2)'
          },
          boxShadow: {
            halo: '0 0 80px 20px rgba(212,175,55,0.12)'
          }
        }
      }
    }
  </script>
  <style>
    body{font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial}
    .holy{font-family:"EB Garamond", serif}
    .btn-gold{background-image:linear-gradient(180deg,#ecd79b,#d4af37);color:#2a220c}
    .btn-gold:hover{filter:brightness(1.03)}
    .orn{background:center/contain no-repeat url('data:image/svg+xml;utf8,\
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="16" viewBox="0 0 320 16">\
<g fill="none" stroke="%23d4af37" stroke-width="1.2" stroke-linecap="round">\
<path d="M2 8h130"/><path d="M188 8h130"/><path d="M160 2l4 6-4 6-4-6 4-6z" fill="%23d4af37"/></g></svg>');height:16px;opacity:.95}
  </style>
</head>
<body class="min-h-screen bg-parchment text-ink">

  <div class="bg-ink text-white text-xs tracking-wide text-center py-2">The Church of Axiom — Clarity, Compassion, Truth</div>

  <header class="relative bg-halo">
    <div class="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
      <a href="/" class="flex items-center gap-4">
        <span class="grid place-items-center h-12 w-12 rounded-full bg-white border border-gold-500 shadow-halo">
          <svg class="h-6 w-6 text-gold-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 6v12a2 2 0 0 1-2 2h-4v-7H11v7H7a2 2 0 0 1-2-2V8l7-6z"/></svg>
        </span>
        <div>
          <div class="holy text-2xl font-semibold">The New Holy Bible</div>
          <div class="text-sm text-slate-600">Church of Axiom • Axiomatism</div>
        </div>
      </a>
      <nav class="hidden md:flex items-center gap-6 text-sm">
        <a href="#mission" class="hover:text-gold-600 transition">Mission</a>
        <a href="#scripture" class="hover:text-gold-600 transition">Scripture</a>
        <a href="#donate" class="hover:text-gold-600 transition">Donate</a>
        <a href="#connect" class="hover:text-gold-600 transition">Connect</a>
      </nav>
    </div>

    <!-- NEW: Big red giving banner with smiling child (3.png) -->
    <section class="max-w-6xl mx-auto px-6 pb-10">
      <div class="rounded-3xl overflow-hidden border border-red-200 bg-gradient-to-br from-red-800 via-red-700 to-red-800">
        <div class="grid md:grid-cols-2">
          <div class="p-8 md:p-12 text-white">
            <h1 class="holy text-4xl md:text-5xl font-semibold leading-tight">
              “Let the little ones learn, and the nations be lifted by truth.”
            </h1>
            <p class="mt-4 text-red-100 text-lg">
              The <span class="font-semibold">Church of Axiom</span> is a Christian movement spreading knowledge and the Word of God,
              especially where it is most needed. Your gift helps build schools, share Scripture, and serve in charity.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a href="#donate" class="inline-block px-5 py-3 rounded-xl btn-gold font-semibold shadow">Give Now</a>
              <a href="#scripture" class="inline-block px-5 py-3 rounded-xl bg-white/10 ring-1 ring-white/30 font-semibold hover:bg-white/15">Read the Scripture</a>
            </div>
          </div>
          <div class="relative">
            <img src="/assets/3.png" alt="Smiling child" class="w-full h-full object-cover md:rounded-l-3xl md:rounded-none">
            <!-- subtle gold glow -->
            <div class="absolute inset-0 pointer-events-none" style="box-shadow: inset 0 0 120px rgba(212,175,55,.18)"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Two photos side-by-side (1.png & 2.png) -->
    <section class="max-w-6xl mx-auto px-6 pb-12 md:pb-20">
      <div class="grid grid-cols-2 gap-4">
        <img src="/assets/1.png" alt="Teacher high-fives student" class="rounded-2xl border border-gold-300 object-cover w-full h-56 sm:h-64">
        <img src="/assets/2.png" alt="Student raises hand in class" class="rounded-2xl border border-gold-300 object-cover w-full h-56 sm:h-64">
      </div>
    </section>

    <div class="orn max-w-3xl mx-auto mb-10"></div>
  </header>

  <section id="mission" class="py-16 text-center max-w-4xl mx-auto px-6">
    <h2 class="holy text-3xl font-semibold">Our Mission</h2>
    <p class="mt-5 text-slate-700 leading-relaxed">
      We proclaim the Gospel with clarity and serve with compassion. Through education and charitable work,
      we bring the light of understanding to communities around the world.
    </p>
  </section>

  <section id="scripture" class="py-16 bg-white/80">
    <div class="max-w-6xl mx-auto px-6 text-center">
      <h2 class="holy text-3xl font-semibold">Scripture & Channels</h2>
      <div class="orn max-w-3xl mx-auto my-6"></div>
      <div class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <a class="group block p-6 rounded-2xl border border-gold-300 bg-white hover:shadow-lg transition" href="https://youtube.com/" target="_blank">YouTube Channel →</a>
        <a class="group block p-6 rounded-2xl border border-gold-300 bg-white hover:shadow-lg transition" href="https://instagram.com/" target="_blank">Instagram →</a>
        <a class="group block p-6 rounded-2xl border border-gold-300 bg-white hover:shadow-lg transition" href="#" target="_blank">Read The Book of Axiom (PDF) →</a>
      </div>
    </div>
  </section>

  <section id="donate" class="py-16 text-center max-w-4xl mx-auto px-6">
    <h2 class="holy text-3xl font-semibold">Offerings & Support</h2>
    <div class="orn max-w-2xl mx-auto my-6"></div>
    <p class="text-slate-700">
      We depend on the generosity of our followers to continue the Lord’s work—spreading His knowledge and goodness.
      Your offering sustains our schools, scripture outreach, and charitable service.
    </p>

    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <button data-amount="25" class="preset px-4 py-2 rounded-xl bg-white border border-gold-300 hover:shadow">$25</button>
      <button data-amount="50" class="preset px-4 py-2 rounded-xl bg-white border border-gold-300 hover:shadow">$50</button>
      <button data-amount="100" class="preset px-4 py-2 rounded-xl bg-white border border-gold-300 hover:shadow">$100</button>
    </div>

    <form id="donation-form" class="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
      <label class="text-slate-700">Custom amount (USD)</label>
      <input id="donation-amount" type="number" min="1" step="1" placeholder="e.g., 250" class="w-44 px-3 py-2 rounded-xl border border-gold-300 bg-white/90"/>
      <button id="donate-button" type="submit" class="px-5 py-2 rounded-xl btn-gold font-semibold shadow">Donate with Card</button>
    </form>

    <div class="mt-12">
      <h3 class="holy text-2xl font-semibold">Join the Daily Prayer — $5/month</h3>
      <p class="mt-2 text-slate-700">Receive a daily prayer or sermon by email. Cancel anytime.</p>
      <button id="subscribe-button" class="mt-4 px-5 py-2 rounded-xl bg-white border border-gold-300 font-semibold hover:shadow">Subscribe $5/mo</button>
      <p class="mt-3 text-xs text-slate-500">Processed securely by Stripe Checkout.</p>
    </div>
  </section>

  <footer class="py-10 text-center text-sm text-slate-600">
    <div class="orn max-w-xl mx-auto mb-6"></div>
    <p>© <span id="year"></span> The New Holy Bible · Church of Axiom</p>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
    document.querySelectorAll('.preset').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.getElementById('donation-amount').value=btn.getAttribute('data-amount');
        document.getElementById('donation-form').dispatchEvent(new Event('submit'));
      });
    });
    document.getElementById('donation-form').addEventListener('submit',async(e)=>{
      e.preventDefault();
      const amount=Number(document.getElementById('donation-amount').value||'0');
      if(!Number.isFinite(amount)||amount<1){alert('Please enter a valid amount (minimum $1).');return;}
      try{
        const res=await fetch('/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amountUsd:amount})});
        const data=await res.json();
        if(data.url)window.location.href=data.url;else alert('Unable to start checkout.');
      }catch{alert('Network error starting checkout.');}
    });
    document.getElementById('subscribe-button').addEventListener('click',async()=>{
      try{
        const res=await fetch('/create-subscription-session',{method:'POST'});
        const data=await res.json();
        if(data.url)window.location.href=data.url;else alert('Unable to start subscription checkout.');
      }catch{alert('Network error starting subscription.');}
    });
  </script>
</body>
</html>`);
});

// ----------------------
// Stripe API Endpoints
// ----------------------
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
            product_data: { name: 'Donation to The New Holy Bible (Aciomatism)' },
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

  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Thank You — The New Holy Bible</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-50 text-slate-800">
<main class="max-w-2xl mx-auto px-6 py-24 text-center">
<h1 class="text-4xl font-extrabold">Thank You</h1>
<p class="mt-4 text-lg">Your support (${amountText}) sustains our mission of education, charity, and the spread of the Word of God.</p>
<a href="/" class="inline-block mt-8 px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold">Return Home</a>
</main></body></html>`);
});

// ----------------------
// Start Server
// ----------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`The New Holy Bible server running on port ${port}`));
