// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import paypal from "@paypal/paypal-server-sdk";

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
   PAYPAL CLIENT SETUP
======================================== */
function getPayPalClient() {
  const environment =
    process.env.PAYPAL_ENV === "live"
      ? new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        )
      : new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID,
          process.env.PAYPAL_CLIENT_SECRET
        );

  return new paypal.core.PayPalHttpClient(environment);
}

/* ========================================
   PAYPAL: CREATE ORDER (Atlas 2)
======================================== */
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();

    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          description: "Atlas 2 Purchase",
        },
      ],
    });

    const order = await client.execute(request);

    res.json({ id: order.result.id });
  } catch (err) {
    console.error("PayPal create-order error:", err);
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
});

/* ========================================
   PAYPAL: CAPTURE ORDER (Atlas 2)
======================================== */
app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: "Missing orderID" });
    }

    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderID);

    request.requestBody({});

    const capture = await client.execute(request);

    if (capture.result.status !== "COMPLETED") {
      throw new Error("Payment not completed");
    }

    res.json({
      status: "COMPLETED",
      orderID: capture.result.id,
    });
  } catch (err) {
    console.error("PayPal capture-order error:", err);
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
});

/* ========================================
   STRIPE: ONE-TIME PAYMENT $23.95
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
   STRIPE: ONE-TIME PAYMENT $33.95
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
   STRIPE: DYNAMIC CART TOTAL
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

/* ========================================
   AIRWALLEX
======================================== */
/* ========================================
   AIRWALLEX
======================================== */
app.post("/api/airwallex/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, customer } = req.body;

    // Step 1: Authenticate and get token
    const authResponse = await fetch("https://api.airwallex.com/api/v1/authentication/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": process.env.AIRWALLEX_CLIENT_ID,
        "x-api-key": process.env.AIRWALLEX_API_KEY
      }
    });

    if (!authResponse.ok) {
      const errData = await authResponse.json();
      throw new Error(errData.message || "Airwallex authentication failed");
    }

    const authData = await authResponse.json();
    const token = authData.token;

    // Step 2: Create payment intent
    const paymentResponse = await fetch("https://api.airwallex.com/api/v1/pa/payment_intents/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        request_id: `req_${Date.now()}`,
        amount: parseFloat(amount), // must be decimal like 23.95
        currency,
        customer
      })
    });

    if (!paymentResponse.ok) {
      const errData = await paymentResponse.json();
      throw new Error(errData.message || "Failed to create Airwallex payment intent");
    }

    const paymentIntent = await paymentResponse.json();

    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    });

  } catch (err) {
    console.error("Airwallex error:", err);
    res.status(400).json({ error: err.message });
  }
});


/* ========================================
   HEALTH CHECK
======================================== */
app.get("/health", (req, res) => {
  res.json({ status: "Payment server running (Stripe + Airwallex + PayPal)" });
});

/* ========================================
   START SERVER
======================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
