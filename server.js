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
import fontkit from "@pdf-lib/fontkit";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

function sanitize(str) {
  return typeof str === "string" ? str.trim() : undefined;
}

function formatOrderDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  return deliveryDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function getPayPalClient() {
  const env = process.env.PAYPAL_ENV === "live" 
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(env);
}

/* --- PAYTIKO --- */
app.post("/api/paytiko/checkout", async (req, res) => {
  try {
    const { firstName, lastName, email, street, city, zipCode, amount } = req.body;
    if (Number(amount) !== 60) return res.status(400).json({ error: "Invalid amount" });
    const timestamp = Math.floor(Date.now() / 1000);
    const orderId = `PTK-${Date.now()}`;
    const sig = crypto.createHash("sha256").update(email + ";" + timestamp + ";" + process.env.PAYTIKO_MERCHANT_SECRET).digest("hex");
    const payload = { MerchantId: Number(process.env.PAYTIKO_MERCHANT_ID), firstName, lastName, email, phone: "", countryCode: "AU", currency: "USD", lockedAmount: 60, orderId, street, city, zipCode, timestamp, signature: sig, isPayout: false };
    const response = await fetch(`${process.env.PAYTIKO_CORE_URL}/api/sdk/checkout`, { method: "POST", headers: { "Content-Type": "application/json", "X-Merchant-Secret": process.env.PAYTIKO_MERCHANT_SECRET }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!data.cashierSessionToken) return res.status(500).json({ error: "Paytiko failed" });
    res.json({ sessionToken: data.cashierSessionToken, orderId });
  } catch (err) { res.status(500).json({ error: "Error" }); }
});

/* --- STRIPE NEW ACCOUNT ROUTES --- */
app.post("/api/stripe/new/one-time-28-95", async (req, res) => {
  try {
    const sNew = new Stripe(process.env.STRIPE_SECRET_KEY_NEW);
    const { paymentMethodId, billingDetails } = req.body;
    const intent = await sNew.paymentIntents.create({
      amount: 2895, currency: "usd", payment_method: paymentMethodId, confirm: false,
      receipt_email: billingDetails?.email || undefined, // Fix for "Invalid email"
      shipping: billingDetails?.address ? { name: billingDetails.name, address: billingDetails.address } : undefined
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/stripe/new/one-time-46-95", async (req, res) => {
  try {
    const sNew = new Stripe(process.env.STRIPE_SECRET_KEY_NEW);
    const { paymentMethodId, billingDetails } = req.body;
    const intent = await sNew.paymentIntents.create({
      amount: 4695, currency: "usd", payment_method: paymentMethodId, confirm: false,
      receipt_email: billingDetails?.email || undefined, // Fix for "Invalid email"
      shipping: billingDetails?.address ? { name: billingDetails.name, address: billingDetails.address } : undefined
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* --- WEBHOOK MAIN ACCOUNT --- */
app.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) { return res.status(400).send(`Error: ${err.message}`); }

  if (event.type === "payment_intent.succeeded") {
    try {
      const intent = event.data.object;
      const orderNumber = await getNextOrderNumber();
      const orderDate = new Date(intent.created * 1000);
      const templatesDir = path.join(__dirname, "public", "pdf-templates", String(intent.amount));
      const files = fs.readdirSync(templatesDir).filter(f => f.toLowerCase().endsWith(".pdf"));
      const templatePath = path.join(templatesDir, files[Math.floor(Math.random() * files.length)]);

      const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
      pdfDoc.registerFontkit(fontkit);
      const fontBytes = await fetch('https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf').then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      const pages = pdfDoc.getPages();
      const p1 = pages[0];
      const p2 = pages[1];
      const clr = rgb(0.35, 0.35, 0.35);

      p1.drawText(`Check out order #${orderNumber}`, { x: 35, y: 737, size: 12, color: clr, font: customFont });
      p1.drawText(formatOrderDate(orderDate), { x: 435, y: 712, size: 10, color: clr, font: customFont });
      p1.drawText(`Order #${orderNumber} successfully`, { x: 130, y: 563, size: 20, color: clr, font: customFont });
      p1.drawText(`submitted`, { x: 98, y: 538, size: 20, color: clr, font: customFont });
      p1.drawText(formatShortDate(orderDate), { x: 134, y: 437, size: 9, color: clr, font: customFont });
      p1.drawText(getDeliveryRange(orderDate), { x: 437, y: 437, size: 9, color: clr, font: customFont });
      p1.drawText(`${orderNumber}`, { x: 124, y: 362, size: 10, color: clr, font: customFont, characterSpacing: -0.4 });

      const pm = await stripe.paymentMethods.retrieve(intent.payment_method);
      const b = pm.billing_details;
      if (b && b.address) {
        const lines = [b.name, b.address.line1, b.address.line2, `${b.address.city}, ${b.address.postal_code}`, b.address.country].filter(Boolean);
        let y = 660;
        for (const l of lines) {
          p2.drawText(l, { x: 117, y, size: 10, color: clr, font: customFont });
          y -= 15;
        }
      }
      const pdfBytes = await pdfDoc.save();
      const fileName = `${9999999999999 - Date.now()}_order-${orderNumber}.pdf`;
      await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: fileName, Body: pdfBytes, ContentType: "application/pdf" }));
    } catch (e) { console.error("Webhook Error:", e); }
  }
  res.json({ received: true });
});

/* --- WEBHOOK NEW ACCOUNT --- */
app.post("/api/stripe/webhook-new", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  const sNew = new Stripe(process.env.STRIPE_SECRET_KEY_NEW);
  try {
    event = sNew.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET_NEW);
  } catch (err) { return res.status(400).send(`Error: ${err.message}`); }

  if (event.type === "payment_intent.succeeded") {
    try {
      const intent = event.data.object;
      const orderNumber = await getNextOrderNumber();
      const orderDate = new Date(intent.created * 1000);
      const templatesDir = path.join(__dirname, "public", "pdf-templates-new", String(intent.amount));
      const files = fs.readdirSync(templatesDir).filter(f => f.toLowerCase().endsWith(".pdf"));
      const templatePath = path.join(templatesDir, files[Math.floor(Math.random() * files.length)]);

      const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
      pdfDoc.registerFontkit(fontkit);
      const fontBytes = await fetch('https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf').then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      const pages = pdfDoc.getPages();
      const p1 = pages[0];
      const p2 = pages[1];
      const clr = rgb(0.35, 0.35, 0.35);

      p1.drawText(`Check out order #${orderNumber}`, { x: 35, y: 737, size: 12, color: clr, font: customFont });
      p1.drawText(formatOrderDate(orderDate), { x: 435, y: 712, size: 10, color: clr, font: customFont });
      p1.drawText(`Order #${orderNumber} successfully`, { x: 130, y: 563, size: 20, color: clr, font: customFont });
      p1.drawText(`submitted`, { x: 98, y: 538, size: 20, color: clr, font: customFont });
      p1.drawText(formatShortDate(orderDate), { x: 134, y: 437, size: 9, color: clr, font: customFont });
      p1.drawText(getDeliveryRange(orderDate), { x: 437, y: 437, size: 9, color: clr, font: customFont });
      p1.drawText(`${orderNumber}`, { x: 124, y: 362, size: 10, color: clr, font: customFont, characterSpacing: -0.4 });

      const pm = await sNew.paymentMethods.retrieve(intent.payment_method);
      const b = pm.billing_details;
      if (b && b.address) {
        const lines = [b.name, b.address.line1, b.address.line2, `${b.address.city}, ${b.address.postal_code}`, b.address.country].filter(Boolean);
        let y = 660;
        for (const l of lines) {
          p2.drawText(l, { x: 117, y, size: 10, color: clr, font: customFont }); // FIXED FONT HERE
          y -= 15;
        }
      }
      const pdfBytes = await pdfDoc.save();
      const fileName = `${9999999999999 - Date.now()}_order-${orderNumber}.pdf`;
      await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: fileName, Body: pdfBytes, ContentType: "application/pdf" }));
    } catch (e) { console.error("New Webhook Error:", e); }
  }
  res.json({ received: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));