// Minimal Stripe PaymentIntent Server
// The New Holy Bible — Church of Axiom

import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------
// CONFIG
// -------------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DOMAIN = process.env.DOMAIN || "https://thenewholybible.com";

const stripe = new Stripe(STRIPE_SECRET_KEY);

// helper for cents
function usd(n) {
  return Math.round(n * 100);
}

// ==========================================
//  ✔ ENDPOINT: charge $23.95 via PaymentIntent
// ==========================================
app.post("/api/stripe/pay-2395", async (req, res) => {
  try {
    const { paymentMethodId, email, name, phone, address } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: "Missing paymentMethodId" });
    }

    // 1) Create customer (no email required, but available)
    const customer = await stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
      phone: phone || undefined,
      address: address || undefined,
      description: "The New Holy Bible – Order"
    });

    // 2) Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: usd(23.95),
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethodId,
      confirmation_method: "manual",
      confirm: true,
      description: "The New Holy Bible – Order",
      metadata: {
        product: "The New Holy Bible – Order",
        amount: "23.95"
      }
    });

    return res.json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(400).json({ error: err.message || "Payment failed" });
  }
});

// ---------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Payment server running on port " + PORT);
});
