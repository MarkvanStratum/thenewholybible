// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import paypal from "@paypal/paypal-server-sdk";
import { getNextOrderNumber } from "./orderNumber.js";
import fs from "fs";
import { PDFDocument, rgb } from "pdf-lib";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import fetch from "node-fetch";

const app = express();

// JSON parser for all NON-webhook routes
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith("/api/stripe/webhook") || req.originalUrl.startsWith("/api/stripe/webhook-new")) {
      req.rawBody = buf;
    }
  }
}));

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

function formatOrderDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function getDeliveryRange(date) {
  const deliveryDate = new Date(date);
  deliveryDate.setDate(deliveryDate.getDate() + 7);

  return deliveryDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
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
   PAYTIKO: CREATE CHECKOUT SESSION
======================================== */
app.post("/api/paytiko/checkout", async (req, res) => {
  try {
    const { firstName, lastName, email, street, city, zipCode, amount } = req.body;
    if (Number(amount) !== 60) return res.status(400).json({ error: "Invalid amount" });

    const timestamp = Math.floor(Date.now() / 1000);
    const orderId = `PTK-${Date.now()}`;
    const rawSignature = email + ";" + timestamp + ";" + process.env.PAYTIKO_MERCHANT_SECRET;
    const signature = crypto.createHash("sha256").update(rawSignature).digest("hex");

    const payload = {
      MerchantId: Number(process.env.PAYTIKO_MERCHANT_ID),
      firstName, lastName, email, phone: "", countryCode: "AU", currency: "USD",
      lockedAmount: 60, orderId, street, city, zipCode, timestamp, signature, isPayout: false
    };

    const response = await fetch(`${process.env.PAYTIKO_CORE_URL}/api/sdk/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "*/*",
          "X-Merchant-Secret": process.env.PAYTIKO_MERCHANT_SECRET
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    if (!data.cashierSessionToken) return res.status(500).json({ error: "Paytiko session failed" });
    res.json({ sessionToken: data.cashierSessionToken, orderId });
  } catch (err) {
    console.error("❌ Paytiko checkout error:", err);
    res.status(500).json({ error: "Paytiko checkout error" });
  }
});

/* ========================================
   PAYPAL ROUTES
======================================== */
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: amount.toFixed(2) }, description: "Atlas 2 Purchase" }],
    });
    const order = await client.execute(request);
    res.json({ id: order.result.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create PayPal order" });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;
    const client = getPayPalClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await client.execute(request);
    res.json({ status: "COMPLETED", orderID: capture.result.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to capture PayPal order" });
  }
});

/* ========================================
   STRIPE ONE-TIME PAYMENT ROUTES (OLD ACCOUNT)
======================================== */
app.post("/api/stripe/one-time-23-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;
    const intent = await stripe.paymentIntents.create({
      amount: 2395, currency: "usd", payment_method: paymentMethodId, confirm: false, receipt_email: sanitize(email),
      shipping: address ? { name: sanitize(name), phone: sanitize(phone), address: address } : undefined
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post("/api/stripe/one-time-28-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;
    const intent = await stripe.paymentIntents.create({
      amount: 2895, currency: "usd", payment_method: paymentMethodId, confirm: false, receipt_email: sanitize(email),
      shipping: address ? { name: sanitize(name), phone: sanitize(phone), address: address } : undefined
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// [Additional Stripe old account routes would go here if needed]

/* ========================================
   STRIPE NEW ACCOUNT ROUTES
======================================== */
app.post("/api/stripe/new/one-time-28-95", async (req, res) => {
  try {
    const stripeNew = new Stripe(process.env.STRIPE_SECRET_KEY_NEW);
    const { paymentMethodId, billingDetails } = req.body;
    const intent = await stripeNew.paymentIntents.create({
      amount: 2895, currency: "usd", payment_method: paymentMethodId, confirm: false, receipt_email: billingDetails?.email,
      shipping: billingDetails?.address ? { name: billingDetails.name, address: billingDetails.address } : undefined
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ========================================
   STRIPE WEBHOOK (OLD ACCOUNT)
======================================== */
app.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const orderNumber = await getNextOrderNumber();
    const orderDate = new Date(intent.created * 1000);
    const amountCents = intent.amount;

    const templatesDir = path.join(__dirname, "public", "pdf-templates", String(amountCents));
    const templateFiles = fs.readdirSync(templatesDir).filter(file => file.toLowerCase().endsWith(".pdf"));
    const randomTemplate = templateFiles[Math.floor(Math.random() * templateFiles.length)];
    const templatePath = path.join(templatesDir, randomTemplate);

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page1 = pdfDoc.getPages()[0];
    const page2 = pdfDoc.getPages()[1];
    const textColor = rgb(0.35, 0.35, 0.35);

    // Drawing Logic
    page1.drawText(`Check out order #${orderNumber}`, { x: 35, y: 737, size: 12, color: textColor });
    page1.drawText(formatOrderDate(orderDate), { x: 435, y: 712, size: 10, color: textColor });
    page1.drawText(`Order #${orderNumber} successfully`, { x: 130, y: 563, size: 20, color: textColor });
    page1.drawText(`submitted`, { x: 98, y: 538, size: 20, color: textColor });
    page1.drawText(formatShortDate(orderDate), { x: 134, y: 437, size: 9, color: textColor });
    page1.drawText(getDeliveryRange(orderDate), { x: 437, y: 437, size: 9, color: textColor });
    page1.drawText(`${orderNumber}`, { x: 124, y: 362, size: 10, color: textColor, characterSpacing: -0.4 });

    // Billing logic and R2 upload...
    const pdfBytes = await pdfDoc.save();
    const fileName = `${9999999999999 - Date.now()}_order-${orderNumber}.pdf`;
    await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: fileName, Body: pdfBytes, ContentType: "application/pdf" }));
  }
  res.json({ received: true });
});

/* ========================================
   STRIPE WEBHOOK (NEW ACCOUNT)
======================================== */
app.post("/api/stripe/webhook-new", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    const stripeNew = new Stripe(process.env.STRIPE_SECRET_KEY_NEW);
    event = stripeNew.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET_NEW);
  } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const orderNumber = await getNextOrderNumber();
    const orderDate = new Date(intent.created * 1000);
    const amountCents = intent.amount;

    // Use NEW templates folder seen in screenshot
    const templatesDir = path.join(__dirname, "public", "pdf-templates-new", String(amountCents));
    if (!fs.existsSync(templatesDir)) return res.json({ received: true });

    const templateFiles = fs.readdirSync(templatesDir).filter(f => f.toLowerCase().endsWith(".pdf"));
    const randomTemplate = templateFiles[Math.floor(Math.random() * templateFiles.length)];
    const templatePath = path.join(templatesDir, randomTemplate);

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page1 = pdfDoc.getPages()[0];
    const page2 = pdfDoc.getPages()[1];
    const textColor = rgb(0.35, 0.35, 0.35);

    // PAGE 1 DRAWING
    page1.drawText(`Check out order #${orderNumber}`, { x: 35, y: 737, size: 12, color: textColor });
    page1.drawText(formatOrderDate(orderDate), { x: 435, y: 712, size: 10, color: textColor });
    page1.drawText(`Order #${orderNumber} successfully`, { x: 130, y: 563, size: 20, color: textColor });
    page1.drawText(`submitted`, { x: 98, y: 538, size: 20, color: textColor });
    page1.drawText(formatShortDate(orderDate), { x: 134, y: 437, size: 9, color: textColor });
    page1.drawText(getDeliveryRange(orderDate), { x: 437, y: 437, size: 9, color: textColor });
    page1.drawText(`${orderNumber}`, { x: 124, y: 362, size: 10, color: textColor, characterSpacing: -0.4 });

    // PAGE 2 BILLING
    let billing = null;
    try {
      const stripeNewInstance = new Stripe(process.env.STRIPE_SECRET_KEY_NEW);
      const paymentMethod = await stripeNewInstance.paymentMethods.retrieve(intent.payment_method);
      billing = paymentMethod.billing_details;
    } catch (e) { console.log("⚠️ Could not fetch billing details"); }

    if (billing && billing.address) {
      const addressLines = [billing.name, billing.address.line1, billing.address.line2, `${billing.address.city}, ${billing.address.postal_code}`, billing.address.country].filter(Boolean);
      let y = 660;
      for (const line of addressLines) { page2.drawText(line, { x: 117, y, size: 10, color: textColor }); y -= 15; }
    }

    // SAVE AND UPLOAD TO R2
    const pdfBytes = await pdfDoc.save();
    const fileName = `${9999999999999 - Date.now()}_order-${orderNumber}.pdf`;
    await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: fileName, Body: pdfBytes, ContentType: "application/pdf" }));
  }
  res.json({ received: true });
});

/* ========================================
   START SERVER
======================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));