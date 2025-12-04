// server.js
// Fully fixed Stripe PaymentIntents backend for your custom checkout page

// ----------------------
// Imports & App Setup
// ----------------------
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const stripeLib = require("stripe");

const app = express();
app.use(express.static("public"));
app.use("/static", express.static(__dirname));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ----------------------
// Stripe Configuration
// ----------------------
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
const stripe = stripeLib(STRIPE_SECRET_KEY);

// ----------------------
// HOME ROUTE (unchanged)
// ----------------------
app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en"><body>
<h1>Server Running</h1>
</body></html>`);
});

// ====================================================================
//  ⭐⭐ YOUR NEW PAYMENT INTENT ENDPOINT — $23.95 CHARGE ⭐⭐
//  This endpoint is what your checkout page MUST call.
// ====================================================================

app.post("/api/stripe/pay-23", async (req, res) => {
  try {
    const { paymentMethodId, name, email, phone, address } = req.body;

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2395, // $23.95
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "manual",
      confirm: true,
      receipt_email: email || undefined,

      shipping: {
        name: name || "",
        phone: phone || "",
        address: {
          line1: address?.line1 || "",
          city: address?.city || "",
          country: address?.country || "",
          postal_code: address?.postal_code || "",
        }
      },

      description: "Order Payment $23.95"
    });

    // Return clientSecret to frontend
    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error("PaymentIntent error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// ====================================================================
// OPTIONAL SECOND PRODUCT — $33.95 CHARGE (if you need it)
// ====================================================================

app.post("/api/stripe/pay-33", async (req, res) => {
  try {
    const { paymentMethodId, name, email, phone, address } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3395, // $33.95
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "manual",
      confirm: true,
      receipt_email: email || undefined,
      shipping: {
        name: name || "",
        phone: phone || "",
        address: {
          line1: address?.line1 || "",
          city: address?.city || "",
          country: address?.country || "",
          postal_code: address?.postal_code || "",
        }
      },
      description: "Order Payment $33.95"
    });

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error("PaymentIntent error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

// ====================================================================
//  OLD CHECKOUT/SESSION ENDPOINTS (unused by your new checkout page)
//  Keeping them for compatibility, safe but NOT used.
// ====================================================================

// Donation Checkout
app.post("/create-checkout-session", async (req, res) => {
  res.status(400).json({ error: "This site now uses PaymentIntents only." });
});

// Subscription Checkout
app.post("/create-subscription-session", async (req, res) => {
  res.status(400).json({ error: "This site now uses PaymentIntents only." });
});

// Success page (not used, but kept safe)
app.get("/success", (req, res) => {
  res.send("<h1>Payment Success</h1>");
});

// Cancel page
app.get("/cancel", (req, res) => {
  res.send("<h1>Payment Canceled.</h1>");
});

// ----------------------
// START SERVER
// ----------------------
const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Stripe PaymentIntent server running on port ${port}`)
);
