// Minimal Stripe Payment Server
// The New Holy Bible — Church of Axiom

const express = require("express");
const cors = require("cors");
const stripeLib = require("stripe");

const app = express();
app.use(express.json());
app.use(cors());

const DOMAIN = process.env.DOMAIN || "https://thenewholybible.com";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("❌ ERROR: STRIPE_SECRET_KEY is missing!");
}

const stripe = stripeLib(STRIPE_SECRET_KEY);

// Helper
function usd(amount) {
  return Math.round(amount * 100);
}

// Endpoint — $23.95
app.post("/api/stripe/pay-2395", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "The New Holy Bible - Order" },
            unit_amount: usd(23.95),
          },
          quantity: 1,
        },
      ],
      success_url: `${DOMAIN}/success`,
      cancel_url: `${DOMAIN}/cancel`
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Unable to create payment session" });
  }
});

// Success Page
app.get("/success", (req, res) => {
  res.send("<h1>Payment Successful</h1>");
});

// Cancel Page
app.get("/cancel", (req, res) => {
  res.send("<h1>Payment Canceled</h1>");
});

// Server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
