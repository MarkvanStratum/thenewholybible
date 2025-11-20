// Minimal Stripe Payment Server
// The New Holy Bible — Church of Axiom

const express = require("express");
const stripeLib = require("stripe");

const app = express();
app.use(express.json());

const DOMAIN = process.env.DOMAIN || "http://localhost:3000";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

const stripe = stripeLib(STRIPE_SECRET_KEY);

// ---------------------------
// Helper: make amount in cents
// ---------------------------
function usd(amount) {
  return Math.round(amount * 100);
}

// ---------------------------
// ✔ Endpoint #1 — charge $23.95
// ---------------------------
app.post("/pay-23", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Payment — $23.95" },
            unit_amount: usd(23.95),
          },
          quantity: 1,
        },
      ],
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/cancel`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Unable to create payment session" });
  }
});

// ---------------------------
// ✔ Endpoint #2 — charge $33.95
// ---------------------------
app.post("/pay-33", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Payment — $33.95" },
            unit_amount: usd(33.95),
          },
          quantity: 1,
        },
      ],
      success_url: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/cancel`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Unable to create payment session" });
  }
});

// ---------------------------
// ✔ Simple success page
// ---------------------------
app.get("/success", (req, res) => {
  res.send("<h1>Payment Successful</h1>");
});

// ✔ Optional cancel page
app.get("/cancel", (req, res) => {
  res.send("<h1>Payment Canceled</h1>");
});

// ---------------------------
// Start server
// ---------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
