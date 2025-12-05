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

// Serve static site
app.use(express.static(path.join(__dirname, "public")));

// Stripe init
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Helper
function sanitize(str) {
  return typeof str === "string" ? str.trim() : undefined;
}

// ================================
// ONE-TIME PAYMENT: $23.95
// ================================
app.post("/api/stripe/one-time-23-95", async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(23.95 * 100),
      currency: "usd",

      confirmation_method: "manual",
      confirm: false, // Frontend will confirm

      receipt_email: sanitize(email),
      description: "One-time purchase: $23.95",
      metadata: {
        customer_name: sanitize(name),
        customer_phone: sanitize(phone)
      },

      shipping: {
        name: sanitize(name),
        phone: sanitize(phone),
        address: {
          line1: sanitize(address?.line1),
          postal_code: sanitize(address?.postal_code),
          city: sanitize(address?.city),
          country: sanitize(address?.country)
        }
      }
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ================================
// ONE-TIME PAYMENT: $33.95
// ================================
app.post("/api/stripe/one-time-33-95", async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(33.95 * 100),
      currency: "usd",

      confirmation_method: "manual",
      confirm: false, // IMPORTANT — frontend confirms

      receipt_email: sanitize(email),
      description: "One-time purchase: $33.95",
      metadata: {
        customer_name: sanitize(name),
        customer_phone: sanitize(phone)
      },

      shipping: {
        name: sanitize(name),
        phone: sanitize(phone),
        address: {
          line1: sanitize(address?.line1),
          postal_code: sanitize(address?.postal_code),
          city: sanitize(address?.city),
          country: sanitize(address?.country)
        }
      }
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Stripe payment server running" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
