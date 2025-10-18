app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>The New Holy Bible — Axiomatism</title>
  <meta name="description" content="The Church of Axiom — a Christian movement dedicated to spreading knowledge and the Word of God, especially where it is most needed." />

  <!-- Fonts: sacred serif + clean sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">

  <!-- Tailwind -->
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

  <!-- top ribbon -->
  <div class="bg-ink text-white text-xs tracking-wide text-center py-2">The Church of Axiom — Clarity, Compassion, Truth</div>

  <header class="relative bg-halo">
    <div class="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
      <a href="/" class="flex items-center gap-4">
        <span class="grid place-items-center h-12 w-12 rounded-full bg-white border border-gold-500 shadow-halo">
          <svg class="h-6 w-6 text-gold-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l7 6v12a2 2 0 0 1-2 2h-4v-7H11v7H7a2 2 0 0 1-2-2V8l7-6z"/></svg>
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

    <!-- Hero -->
    <section class="max-w-6xl mx-auto px-6 pb-12 md:pb-20 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="holy text-5xl md:text-6xl font-semibold leading-tight">
          “The Word is Clarity. <span class="text-gold-600">The Work is Compassion.</span>”
        </h1>
        <p class="mt-6 text-lg text-slate-700">
          The <strong>Church of Axiom</strong> is a Christian movement devoted to spreading knowledge and the Word of God
          throughout the world—especially where it is most needed. We teach, found schools, and serve in charity so that
          wisdom is known through kindness and truth.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="#donate" class="inline-block px-5 py-3 rounded-xl btn-gold font-semibold shadow">Support the Mission</a>
          <a href="#scripture" class="inline-block px-5 py-3 rounded-xl bg-white/90 border border-gold-500 font-semibold hover:bg-white">Read the Scripture</a>
        </div>
      </div>

      <!-- image collage -->
      <div class="grid grid-cols-2 gap-4">
        <img src="/images/children-1.jpg" alt="Teacher high-fives student" class="rounded-2xl border border-gold-300 object-cover w-full h-56 sm:h-64">
        <img src="/images/children-2.jpg" alt="Student raises hand in class" class="rounded-2xl border border-gold-300 object-cover w-full h-56 sm:h-64">
        <img src="/images/children-3.jpg" alt="Smiling child" class="rounded-2xl border border-gold-300 object-cover w-full h-56 sm:h-64 col-span-2">
      </div>
    </section>
    <div class="orn max-w-3xl mx-auto mb-10"></div>
  </header>

  <!-- Mission -->
  <section id="mission" class="py-16">
    <div class="max-w-4xl mx-auto px-6 text-center">
      <h2 class="holy text-3xl font-semibold">Our Mission</h2>
      <p class="mt-5 text-slate-700 leading-relaxed">
        We proclaim the Gospel with clarity and serve with compassion. Through education and charitable work,
        we bring the light of understanding to communities around the world.
      </p>
    </div>
  </section>

  <!-- Scripture / Links -->
  <section id="scripture" class="py-16 bg-white/80">
    <div class="max-w-6xl mx-auto px-6">
      <h2 class="holy text-3xl font-semibold text-center">Scripture & Channels</h2>
      <div class="orn max-w-3xl mx-auto my-6"></div>

      <div class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <a class="group block p-6 rounded-2xl border border-gold-300 bg-white hover:shadow-lg transition" href="https://youtube.com/" target="_blank" rel="noopener">
          <div class="flex items-center justify-between"><span class="font-semibold">YouTube Channel</span><span class="text-gold-600 group-hover:translate-x-0.5 transition">→</span></div>
          <p class="text-sm text-slate-600 mt-2">Homilies, scripture readings, and teachings.</p>
        </a>
        <a class="group block p-6 rounded-2xl border border-gold-300 bg-white hover:shadow-lg transition" href="https://instagram.com/" target="_blank" rel="noopener">
          <div class="flex items-center justify-between"><span class="font-semibold">Instagram</span><span class="text-gold-600 group-hover:translate-x-0.5 transition">→</span></div>
          <p class="text-sm text-slate-600 mt-2">Daily verses and moments from service.</p>
        </a>
        <a class="group block p-6 rounded-2xl border border-gold-300 bg-white hover:shadow-lg transition" href="#" target="_blank" rel="noopener">
          <div class="flex items-center justify-between"><span class="font-semibold">Read The Book of Axiom (PDF)</span><span class="text-gold-600 group-hover:translate-x-0.5 transition">→</span></div>
          <p class="text-sm text-slate-600 mt-2">The scripture that guides our work.</p>
        </a>
      </div>
    </div>
  </section>

  <!-- Donate -->
  <section id="donate" class="py-16">
    <div class="max-w-4xl mx-auto px-6">
      <h2 class="holy text-3xl font-semibold text-center">Offerings & Support</h2>
      <div class="orn max-w-2xl mx-auto my-6"></div>

      <p class="text-center text-slate-700 max-w-2xl mx-auto">
        We depend on the generosity of our followers to continue the Lord’s work—spreading His knowledge and goodness.
        Your offering sustains our schools, scripture outreach, and charitable service.
      </p>

      <!-- Presets -->
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button data-amount="25" class="preset px-4 py-2 rounded-xl bg-white border border-gold-300 hover:shadow">$25</button>
        <button data-amount="50" class="preset px-4 py-2 rounded-xl bg-white border border-gold-300 hover:shadow">$50</button>
        <button data-amount="100" class="preset px-4 py-2 rounded-xl bg-white border border-gold-300 hover:shadow">$100</button>
      </div>

      <!-- Custom amount -->
      <form id="donation-form" class="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
        <label class="text-slate-700">Custom amount (USD)</label>
        <input id="donation-amount" type="number" min="1" step="1" placeholder="e.g., 250"
               class="w-44 px-3 py-2 rounded-xl border border-gold-300 bg-white/90 focus:outline-none focus:ring-2 focus:ring-gold-500"/>
        <button id="donate-button" type="submit" class="px-5 py-2 rounded-xl btn-gold font-semibold shadow">Donate with Card</button>
      </form>

      <!-- Subscription -->
      <div class="mt-12 text-center">
        <h3 class="holy text-2xl font-semibold">Join the Daily Prayer — $5/month</h3>
        <p class="mt-2 text-slate-700">Receive a daily prayer or sermon by email. Cancel anytime.</p>
        <button id="subscribe-button" class="mt-4 px-5 py-2 rounded-xl bg-white border border-gold-300 font-semibold hover:shadow">Subscribe $5/mo</button>
        <p class="mt-3 text-xs text-slate-500">Processed securely by Stripe Checkout.</p>
      </div>
    </div>
  </section>

  <!-- Connect -->
  <section id="connect" class="py-16 bg-white/80">
    <div class="max-w-4xl mx-auto px-6 text-center">
      <h2 class="holy text-3xl font-semibold">Stay Connected</h2>
      <p class="mt-4 text-slate-700">Questions, volunteering, or partnership for schools and charity?
        Email <a class="underline decoration-gold-600 decoration-2 underline-offset-4" href="mailto:contact@thenewholybible.com">contact@thenewholybible.com</a>.
      </p>
    </div>
  </section>

  <footer class="py-10 text-center text-sm text-slate-600">
    <div class="orn max-w-xl mx-auto mb-6"></div>
    <p>© <span id="year"></span> The New Holy Bible · Church of Axiom</p>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();

    // Preset donation buttons
    document.querySelectorAll('.preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = btn.getAttribute('data-amount');
        const input = document.getElementById('donation-amount');
        input.value = amt;
        document.getElementById('donation-form').dispatchEvent(new Event('submit'));
      });
    });

    // Custom donation submit
    document.getElementById('donation-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById('donation-amount').value || '0');
      if (!Number.isFinite(amount) || amount < 1) { alert('Please enter a valid amount (minimum $1).'); return; }
      try {
        const res = await fetch('/create-checkout-session', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ amountUsd: amount })
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url; else alert('Unable to start checkout.');
      } catch { alert('Network error starting checkout.'); }
    });

    // Subscription submit
    document.getElementById('subscribe-button').addEventListener('click', async () => {
      try {
        const res = await fetch('/create-subscription-session', { method:'POST' });
        const data = await res.json();
        if (data.url) window.location.href = data.url; else alert('Unable to start subscription checkout.');
      } catch { alert('Network error starting subscription.'); }
    });
  </script>
</body>
</html>`);
});
