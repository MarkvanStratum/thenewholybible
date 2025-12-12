// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(cors());

// Enable __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static site (public folder)
app.use(express.static(path.join(__dirname, "public")));

// Stripe init
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Helper to sanitize strings
function sanitize(str) {
  return typeof str === "string" ? str.trim() : undefined;
}

/* ========================================
   ONE-TIME PAYMENT: $23.95
======================================== */
app.post("/api/stripe/one-time-23-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(23.95 * 100),
      currency: "usd",

      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,

      receipt_email: sanitize(email),
      description: "One-time purchase: $23.95",

      metadata: {
        customer_name: sanitize(name),
        customer_phone: sanitize(phone),
      },

      shipping: {
        name: sanitize(name),
        phone: sanitize(phone),
        address: {
          line1: sanitize(address?.line1),
          postal_code: sanitize(address?.postal_code),
          city: sanitize(address?.city),
          country: sanitize(address?.country),
        },
      },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ========================================
   ONE-TIME PAYMENT: $33.95
======================================== */
app.post("/api/stripe/one-time-33-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(33.95 * 100),
      currency: "usd",

      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,

      receipt_email: sanitize(email),
      description: "One-time purchase: $33.95",

      metadata: {
        customer_name: sanitize(name),
        customer_phone: sanitize(phone),
      },

      shipping: {
        name: sanitize(name),
        phone: sanitize(phone),
        address: {
          line1: sanitize(address?.line1),
          postal_code: sanitize(address?.postal_code),
          city: sanitize(address?.city),
          country: sanitize(address?.country),
        },
      },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ========================================
   DYNAMIC WooCommerce CART TOTAL (USD)
======================================== */
app.post("/api/stripe/charge-cart-total", async (req, res) => {
  try {
    const { paymentMethodId, amountUSD, name, email, phone, address } = req.body;

    if (!amountUSD || amountUSD <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amountUSD * 100),
      currency: "usd",

      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,

      receipt_email: sanitize(email),
      description: `WooCommerce cart payment: $${amountUSD}`,

      metadata: {
        customer_name: sanitize(name),
        customer_phone: sanitize(phone),
        cart_total_usd: amountUSD,
      },

      shipping: {
        name: sanitize(name),
        phone: sanitize(phone),
        address: {
          line1: sanitize(address?.line1),
          postal_code: sanitize(address?.postal_code),
          city: sanitize(address?.city),
          country: sanitize(address?.country),
        },
      },
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Airwallex route
app.post("/api/airwallex/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, customer } = req.body;

    const response = await fetch(
      "https://api.airwallex.com/api/v1/pa/payment_intents/create",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRWALLEX_SECRET_KEY}`,
          "Content-Type": "application/json",
          "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        },
        body: JSON.stringify({
          request_id: `req_${Date.now()}`,
          amount,
          currency,
          customer,
          merchant_order_id: `order_${Date.now()}`,
          return_url: `${req.headers.origin || "https://checkoutpartner.xyz"}/thank-you`,
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "Failed to create Airwallex payment intent");
    }

    const responseData = await response.json();

    res.json({
      paymentIntentId: responseData.id,
      clientSecret: responseData.client_secret,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ========================================
   HEALTH CHECK
======================================== */
app.get("/health", (req, res) => {
  res.json({ status: "Payment server running (Stripe + Airwallex)" });
});

/* ========================================
   START SERVER
======================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
