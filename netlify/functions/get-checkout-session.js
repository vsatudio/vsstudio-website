"use strict";

const { getStripe } = require("./_shared/stripe-client");
const { getCourse, calculatePayment, SCHEMA_VERSION } = require("./_shared/course-catalog");
const { getStudentName } = require("./_shared/domia-adapter");
const { json } = require("./_shared/http");

function metadataMatchesCatalog(metadata) {
  const course = getCourse(metadata.courseId);
  const payment = calculatePayment(course, metadata.paymentType);
  if (!course || !payment || metadata.schemaVersion !== SCHEMA_VERSION) return false;

  return metadata.courseName === course.name &&
    metadata.totalPrice === String(payment.totalCents) &&
    metadata.amountPaid === String(payment.amountPaidCents) &&
    metadata.remainingAmount === String(payment.remainingCents) &&
    metadata.currency === "EUR";
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Método no permitido." }, { Allow: "GET" });
  }

  const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
  if (!sessionId || !/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) {
    return json(400, { error: "Referencia de pago no válida." });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"]
    });
    const metadata = session.metadata || {};

    if (session.livemode || !metadataMatchesCatalog(metadata)) {
      return json(403, { error: "La sesión no pertenece al sistema de pagos de VS Studio." });
    }
    if (session.payment_status !== "paid") {
      return json(409, { error: "El pago todavía no aparece como completado." });
    }

    const paymentIntent = session.payment_intent;
    const charge = paymentIntent && paymentIntent.latest_charge;

    return json(200, {
      studentName: getStudentName(session),
      email: session.customer_details && session.customer_details.email,
      courseName: metadata.courseName,
      totalCents: Number(metadata.totalPrice),
      paymentType: metadata.paymentType,
      amountPaidCents: Number(metadata.amountPaid),
      remainingCents: Number(metadata.remainingAmount),
      currency: metadata.currency,
      paidAt: new Date(session.created * 1000).toISOString(),
      stripeReference: paymentIntent && paymentIntent.id ? paymentIntent.id : session.id,
      stripeReceiptUrl: charge && charge.receipt_url ? charge.receipt_url : null
    });
  } catch (error) {
    if (error && error.code === "resource_missing") {
      return json(404, { error: "No se encontró la sesión de pago." });
    }
    console.error("No se pudo recuperar la sesión de Checkout:", error.message);
    return json(500, { error: "No se pudieron recuperar los datos del pago." });
  }
};

module.exports.metadataMatchesCatalog = metadataMatchesCatalog;

