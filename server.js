// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stripe init
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Helper to sanitize strings
function sanitize(str) {
  return typeof str === "string" ? str.trim() : undefined;
}

// =========================
// Stripe Routes
// =========================

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
      metadata: { customer_name: sanitize(name), customer_phone: sanitize(phone) },
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
      metadata: { customer_name: sanitize(name), customer_phone: sanitize(phone) },
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

// =========================
// WooCommerce Dynamic
// =========================

app.post("/api/stripe/charge-cart-total", async (req, res) => {
  try {
    const { paymentMethodId, amountUSD, name, email, phone, address } = req.body;
    if (!amountUSD || amountUSD <= 0) return res.status(400).json({ error: "Invalid amount" });

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

// =========================
// Airwallex Payment Route
// =========================

app.post("/api/airwallex/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, customer } = req.body;
    const response = await fetch("https://api.airwallex.com/api/v1/pa/payment_intents/create", {
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
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Airwallex API Error:", response.status, errData);
      throw new Error(errData.message || `Failed to create Airwallex payment intent`);
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

// =========================
// PayPal
// =========================

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET_KEY}`
  ).toString("base64");

  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Failed to get PayPal access token");
  return data.access_token;
}

// 🔹 Existing helper (unchanged)
async function createPayPalOrder(amount, currency = "USD") {
  const accessToken = await getPayPalAccessToken();

  const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
        description: `One-time purchase: $${amount}`,
      }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create PayPal order");
  return data;
}

// 🔹 Existing routes (unchanged)
app.post("/api/paypal/one-time-23-95", async (req, res) => {
  try {
    const order = await createPayPalOrder(23.95);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/paypal/one-time-33-95", async (req, res) => {
  try {
    const order = await createPayPalOrder(33.95);
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// =========================
// ✅ NEW PayPal JS SDK ROUTES (Option A)
// =========================

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount = 23.95, currency = "USD" } = req.body;
    const accessToken = await getPayPalAccessToken();

    const response = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("PayPal create-order error:", data);
      return res.status(400).json({ error: data.message || "Failed to create order" });
    }

    // IMPORTANT: JS SDK expects ONLY the ID
    res.json({ id: data.id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(
      `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("PayPal capture error:", data);
      return res.status(400).json({ error: data.message || "Capture failed" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================
// Health Check
// =========================

app.get("/health", (req, res) => {
  res.json({ status: "Payment server running (Stripe + PayPal + Airwallex)" });
});

// =========================
// ✅ Serve static files LAST
// =========================

app.use(express.static(path.join(__dirname, "public")));

// =========================
// Start Server
// =========================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
