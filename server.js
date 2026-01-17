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





const app = express();
// JSON parser for all NON-webhook routes
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.startsWith("/api/stripe/webhook")) {
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
      shipping: address ? {
        name: sanitize(name),
        phone: sanitize(phone),
        address: {
          line1: sanitize(address.line1),
          line2: sanitize(address.line2),
          city: sanitize(address.city),
          postal_code: sanitize(address.postal_code),
          country: sanitize(address.country),
        }
      } : undefined,
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
   STRIPE: ONE-TIME PAYMENT $60.00
======================================== */
app.post("/api/stripe/one-time-60", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: "Missing paymentMethodId" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(60 * 100), // $60.00 in cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,
      receipt_email: sanitize(email),
      description: "One-time purchase: $60.00",
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
    console.error("Stripe $60 payment error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ========================================
   STRIPE: ONE-TIME PAYMENT $39.95
======================================== */
app.post("/api/stripe/one-time-39-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: "Missing paymentMethodId" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(39.95 * 100), // $39.95 in cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,
      receipt_email: sanitize(email),
      description: "One-time purchase: $39.95",
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
    console.error("Stripe $39.95 payment error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ========================================
   STRIPE: ONE-TIME PAYMENT $28.95
======================================== */
app.post("/api/stripe/one-time-28-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: "Missing paymentMethodId" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(28.95 * 100), // $28.95 in cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,
      receipt_email: sanitize(email),
      description: "One-time purchase: $28.95",
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
    console.error("Stripe $28.95 payment error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ========================================
   STRIPE: ONE-TIME PAYMENT $46.95
======================================== */
app.post("/api/stripe/one-time-46-95", async (req, res) => {
  try {
    const { name, email, phone, address, paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: "Missing paymentMethodId" });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(46.95 * 100), // $46.95 in cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirmation_method: "automatic",
      confirm: false,
      receipt_email: sanitize(email),
      description: "One-time purchase: $46.95",
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
    console.error("Stripe $46.95 payment error:", err);
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
app.post('/api/airwallex/create-payment-intent', async (req, res) => {
  console.log('=== AIRWALLEX REQUEST RECEIVED ===');
  console.log('Request body:', req.body);
  
  try {
    const { amount, currency, customer } = req.body;

    console.log('AIRWALLEX_CLIENT_ID:', process.env.AIRWALLEX_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('AIRWALLEX_API_KEY:', process.env.AIRWALLEX_API_KEY ? 'SET' : 'MISSING');

    // Step 1: Authenticate
    console.log('Attempting authentication...');
    const authResponse = await fetch('https://api.airwallex.com/api/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.AIRWALLEX_CLIENT_ID,
        'x-api-key': process.env.AIRWALLEX_API_KEY
      }
    });

    const authData = await authResponse.json();
    console.log('Auth response status:', authResponse.status);
    console.log('Auth response:', JSON.stringify(authData, null, 2));
    
    if (!authData.token) {
      console.error('Authentication failed - no token');
      return res.status(401).json({ error: authData.message || 'Authentication failed' });
    }

    console.log('Authentication successful');

    // Step 2: Create PaymentIntent
    console.log('Creating payment intent...');
    const paymentResponse = await fetch('https://api.airwallex.com/api/v1/pa/payment_intents/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify({
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount,
        currency: currency,
        merchant_order_id: `order_${Date.now()}`,
        customer: customer,
        return_url: "https://checkoutpartner.xyz/success"
      })
    });

    const paymentData = await paymentResponse.json();
    console.log('Payment response status:', paymentResponse.status);
    console.log('Payment response:', JSON.stringify(paymentData, null, 2));

    if (!paymentData.id || !paymentData.client_secret) {
      console.error('Payment creation failed');
      return res.status(400).json({ error: paymentData.message || 'Failed to create payment intent' });
    }

    console.log('Payment intent created successfully');

    res.json({
      id: paymentData.id,
      client_secret: paymentData.client_secret
    });

  } catch (error) {
    console.error('Airwallex error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ========================================
   HEALTH CHECK
======================================== */
app.get("/health", (req, res) => {
  res.json({ status: "Payment server running (Stripe + Airwallex + PayPal)" });
});

/* ========================================
   TEST ORDER NUMBER (TEMP)
======================================== */
app.get("/test-order-number", (req, res) => {
  const number = getNextOrderNumber();
  res.send(`Next order number is ${number}`);
});




/* ========================================
   STRIPE WEBHOOK
======================================== */

// Stripe requires the raw body for webhooks
app.post("/api/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;

      const orderNumber = await getNextOrderNumber();
      const orderDate = new Date(intent.created * 1000);

      // Folder that contains multiple 2895 templates
const templatesDir = path.join(
  __dirname,
  "public",
  "pdf-templates",
  "2895"
);

// Read all PDF files in the folder
const templateFiles = fs
  .readdirSync(templatesDir)
  .filter(file => file.toLowerCase().endsWith(".pdf"));

if (templateFiles.length === 0) {
  throw new Error("No PDF templates found in pdf-templates/2895");
}

// Pick one template at random
const randomTemplate =
  templateFiles[Math.floor(Math.random() * templateFiles.length)];

const templatePath = path.join(templatesDir, randomTemplate);

console.log("📄 Using PDF template:", randomTemplate);
     

      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      const pages = pdfDoc.getPages();
      const page1 = pages[0];
      const page2 = pages[1];

      const cm = 28.35;
      const textColor = rgb(0.35, 0.35, 0.35);

      const page1Height = page1.getHeight();
      const page2Height = page2.getHeight();

      // TOP LEFT: order number
page1.drawText(`Check out order #${orderNumber}`, {
  x: 35,
  y: 737,
  size: 12,
  color: textColor,
});

// TOP RIGHT: order date
page1.drawText(formatOrderDate(orderDate), {
  x: 435,
  y: 712,
  size: 10,
  color: textColor,
});

// MAIN TITLE (two lines, like the example PDF)
page1.drawText(`Order #${orderNumber} successfully`, {
  x: 99,
  y: 563,
  size: 20,
  color: textColor,
});

page1.drawText(`submitted`, {
  x: 98,
  y: 538,
  size: 20,
  color: textColor,
});

// TIMELINE DATES
page1.drawText(formatShortDate(orderDate), {
  x: 134,
  y: 437,
  size: 9,
  color: textColor,
});

page1.drawText(getDeliveryRange(orderDate), {
  x: 437,
  y: 437,
  size: 9,
  color: textColor,
});

// ORDER NUMBER — precisely aligned inside sentence
page1.drawText(`#${orderNumber}`, {
  x: 120,    // more LEFT
  y: 362,   // more UP
  size: 10,
  color: textColor,
  characterSpacing: -0.4,
});






      let billing = null;

if (intent.payment_method) {
  const paymentMethod = await stripe.paymentMethods.retrieve(
    intent.payment_method
  );

  billing = paymentMethod.billing_details;
}


if (!billing || !billing.address) {
  console.log("❌ NO BILLING ADDRESS FOUND");
} else {
  console.log("✅ BILLING ADDRESS FOUND:", billing);
}

if (billing && billing.address) {
  const addressLines = [
    billing.name,
    billing.address.line1,
    billing.address.line2,
    `${billing.address.city}, ${billing.address.postal_code}`,
    billing.address.country,
  ].filter(Boolean);

  const pageWidth = page2.getWidth();
  const pageHeight = page2.getHeight();

  let y = 660;
const x = 117;


  for (const line of addressLines) {
    page2.drawText(line, {
  x,
  y,
  size: 10,
  color: textColor,
  characterSpacing: -0.2,
});
    y -= 12;
  }
} else {
  page2.drawText("NO BILLING ADDRESS FOUND", {
    x: 100,
    y: page2.getHeight() / 2,
    size: 18,
    color: rgb(0.35, 0.35, 0.35),
  });
}


      const pdfBytes = await pdfDoc.save();
      const fileName = `order-${orderNumber}.pdf`;

try {
  console.log("🚀 Attempting R2 upload:", fileName);

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: pdfBytes,
      ContentType: "application/pdf",
    })
  );

  console.log("✅ PDF UPLOADED TO R2:", fileName);
} catch (r2Error) {
  console.error("❌ R2 UPLOAD FAILED:", r2Error);
  // DO NOT throw
  // Webhook must still return 200 to Stripe
}

console.log("✅ PDF UPLOADED TO R2:", fileName);


          }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    res.status(500).send("Webhook handler error");
  }
});



/* ========================================
   START SERVER
======================================== */
const PORT = process.env.PORT || 10000;
app.get("/admin/orders", (req, res) => {
  const password = req.query.password;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).send("Unauthorized");
  }

  const ordersDir = path.join(__dirname, "orders");

  if (!fs.existsSync(ordersDir)) {
    return res.send("<h1>No orders yet</h1>");
  }

  const files = fs
    .readdirSync(ordersDir)
    .filter(file => file.endsWith(".pdf"));

  let html = `
    <h1>Order PDFs</h1>
    <ul>
  `;

  for (const file of files) {
    html += `
      <li>
        ${file}
        <a href="/admin/orders/download/${file}?password=${password}">
          [Download]
        </a>
      </li>
    `;
  }

  html += "</ul>";

  res.send(html);
});

app.get("/admin/orders/download/:filename", (req, res) => {
  const password = req.query.password;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).send("Unauthorized");
  }

  const filePath = path.join(__dirname, "orders", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.download(filePath);
});


app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
