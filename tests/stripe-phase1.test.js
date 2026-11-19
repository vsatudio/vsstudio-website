"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Stripe = require("stripe");
const catalog = require("../netlify/functions/_shared/course-catalog");

test("el catálogo contiene los siete cursos y calcula depósito y pago completo", () => {
  const expected = {
    "manicura-profesional": [25000, 7500, 17500],
    "masterclass-nail-art": [9900, 2970, 6930],
    "extensiones-pestanas-profesional": [35000, 10500, 24500],
    "masterclass-extensiones-pestanas": [20000, 6000, 14000],
    "lifting-pestanas": [18000, 5400, 12600],
    "diseno-cejas-tinte": [18000, 5400, 12600],
    microblading: [35000, 10500, 24500]
  };

  assert.equal(Object.keys(catalog.courses).length, 7);
  for (const [courseId, values] of Object.entries(expected)) {
    const course = catalog.getCourse(courseId);
    const deposit = catalog.calculatePayment(course, "deposit");
    const full = catalog.calculatePayment(course, "full");
    assert.deepEqual([course.totalCents, deposit.amountPaidCents, deposit.remainingCents], values);
    assert.equal(full.amountPaidCents, course.totalCents);
    assert.equal(full.remainingCents, 0);
  }
});

test("create-checkout-session rechaza datos no válidos antes de contactar Stripe", async () => {
  const fn = require("../netlify/functions/create-checkout-session");
  const response = await fn.handler({
    httpMethod: "POST",
    headers: {},
    body: JSON.stringify({ courseId: "inventado", paymentType: "deposit", amount: 1 })
  });
  assert.equal(response.statusCode, 400);
});

test("get-checkout-session rechaza referencias que no sean de test", async () => {
  const fn = require("../netlify/functions/get-checkout-session");
  const response = await fn.handler({
    httpMethod: "GET",
    queryStringParameters: { session_id: "cs_live_no_permitida" }
  });
  assert.equal(response.statusCode, 400);
});

test("el webhook acepta una firma válida y prepara el registro sin enviar a DOMIA", async () => {
  const testKey = ["sk", "test", "dummy"].join("_");
  const webhookSecret = ["whsec", "local", "dummy"].join("_");
  process.env.STRIPE_SECRET_KEY = testKey;
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  const course = catalog.getCourse("extensiones-pestanas-profesional");
  const payment = catalog.calculatePayment(course, "deposit");
  const session = {
    id: "cs_test_local",
    object: "checkout.session",
    livemode: false,
    payment_status: "paid",
    payment_intent: "pi_test_local",
    created: 1700000000,
    custom_fields: [{ key: "student_name", text: { value: "Alumna Test" } }],
    customer_details: { email: "alumna@example.test", name: null },
    metadata: catalog.buildMetadata(course, "deposit", payment)
  };
  const payload = JSON.stringify({
    id: "evt_test_local",
    object: "event",
    type: "checkout.session.completed",
    data: { object: session }
  });
  const stripe = new Stripe(testKey);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const fn = require("../netlify/functions/stripe-webhook");
  const response = await fn.handler({
    httpMethod: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
    isBase64Encoded: false
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { received: true });
});
