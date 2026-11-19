"use strict";

const { getStripe } = require("./_shared/stripe-client");
const { getCourse, calculatePayment, SCHEMA_VERSION } = require("./_shared/course-catalog");
const { prepareDomiaRecord, sendToDomia } = require("./_shared/domia-adapter");
const { json } = require("./_shared/http");

function getRawBody(event) {
  return event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "", "utf8");
}

function isValidVsStudioSession(session) {
  const metadata = session.metadata || {};
  const course = getCourse(metadata.courseId);
  const payment = calculatePayment(course, metadata.paymentType);

  return Boolean(!session.livemode && course && payment &&
    metadata.schemaVersion === SCHEMA_VERSION &&
    metadata.courseName === course.name &&
    metadata.totalPrice === String(payment.totalCents) &&
    metadata.amountPaid === String(payment.amountPaidCents) &&
    metadata.remainingAmount === String(payment.remainingCents) &&
    metadata.currency === "EUR");
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido." }, { Allow: "POST" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET no está configurada.");
    return json(500, { error: "Webhook no configurado." });
  }

  const signature = event.headers && (event.headers["stripe-signature"] || event.headers["Stripe-Signature"]);
  if (!signature) return json(400, { error: "Falta la firma de Stripe." });

  let stripeEvent;
  try {
    stripeEvent = getStripe().webhooks.constructEvent(getRawBody(event), signature, webhookSecret);
  } catch (error) {
    console.error("Firma de webhook no válida:", error.message);
    return json(400, { error: "Firma de webhook no válida." });
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return json(200, { received: true, ignored: true });
  }

  const session = stripeEvent.data.object;
  if (!isValidVsStudioSession(session) || session.payment_status !== "paid") {
    console.error("Sesión de Checkout ajena, inconsistente o no pagada:", session.id);
    return json(400, { error: "Sesión de Checkout no válida." });
  }

  const domiaRecord = prepareDomiaRecord(session);
  const domiaResult = await sendToDomia(domiaRecord);

  // No registrar datos personales. event.id permitirá añadir idempotencia persistente al conectar DOMIA.
  console.log("Checkout confirmado", {
    eventId: stripeEvent.id,
    sessionId: session.id,
    courseId: domiaRecord.courseId,
    paymentType: domiaRecord.paymentType,
    domiaSent: domiaResult.sent
  });

  return json(200, { received: true });
};

module.exports.isValidVsStudioSession = isValidVsStudioSession;

