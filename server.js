// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import paypal from "@paypal/paypal-server-sdk";
import orderNumberPkg from "./orderNumber.js";
const { getNextOrderNumber } = orderNumberPkg;
import fs from "fs";



const app = express();
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

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

function getDeliveryRange(date) {
  const start = new Date(date);
  start.setDate(start.getDate() + 13);

  const end = new Date(date);
  end.setDate(end.getDate() + 17);

  const month = start.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${start.getDate()}–${end.getDate()}`;
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
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // We only care about successful payments
    if (event.type === "payment_intent.succeeded") {
  const intent = event.data.object;

  const orderNumber = getNextOrderNumber();
  const orderDate = new Date();
  const deliveryRange = getDeliveryRange(orderDate);

  const { PDFDocument, rgb } = await import("pdf-lib");

  // Paths
  const templatePath = path.join(
    __dirname,
    "public",
    "pdf-templates",
    "2895.pdf"
  );

  const ordersDir = path.join(__dirname, "orders");
  const outputPath = path.join(ordersDir, `order-${orderNumber}.pdf`);

  // Ensure /orders exists
  if (!fs.existsSync(ordersDir)) {
    fs.mkdirSync(ordersDir);
  }

  // Load template
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];

  const textColor = rgb(0.35, 0.35, 0.35);

  // Order number (top right + header)
  page.drawText(String(orderNumber), { x: 430, y: 760, size: 12, color: textColor });
  page.drawText(String(orderNumber), { x: 180, y: 735, size: 10, color: textColor });

  // Order date
  page.drawText(formatOrderDate(orderDate), {
    x: 80,
    y: 715,
    size: 10,
    color: textColor,
  });

  // Delivery range
  page.drawText(deliveryRange, {
    x: 80,
    y: 690,
    size: 10,
    color: textColor,
  });

  // Shipping address
  const ship = intent.shipping;
  if (ship && ship.address) {
    const lines = [
      ship.name,
      ship.address.line1,
      `${ship.address.city}, ${ship.address.postal_code}`,
      ship.address.country,
    ];

    let y = 520;
    for (const line of lines) {
      if (!line) continue;
      page.drawText(line, { x: 80, y, size: 10, color: textColor });
      y -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`📄 PDF created: orders/order-${orderNumber}.pdf`);
}


    res.json({ received: true });
  }
);


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
