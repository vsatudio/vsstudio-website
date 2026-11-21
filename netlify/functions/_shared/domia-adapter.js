"use strict";

function getStudentName(session) {
  const nameField = Array.isArray(session.custom_fields)
    ? session.custom_fields.find((field) => field.key === "student_name")
    : null;

  return (nameField && nameField.text && nameField.text.value) ||
    (session.customer_details && session.customer_details.name) || "";
}

function prepareDomiaRecord(session) {
  const metadata = session.metadata || {};
  return Object.freeze({
    stripeEventSource: "checkout.session.completed",
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent && session.payment_intent.id,
    studentName: getStudentName(session),
    studentEmail: session.customer_details && session.customer_details.email,
    courseId: metadata.courseId,
    courseName: metadata.courseName,
    paymentType: metadata.paymentType,
    totalCents: Number(metadata.totalPrice),
    amountPaidCents: Number(metadata.amountPaid),
    remainingCents: Number(metadata.remainingAmount),
    currency: metadata.currency,
    paidAt: new Date(session.created * 1000).toISOString()
  });
}

async function sendToDomia() {
  // FASE 1: adaptador intencionadamente inactivo. No realiza llamadas externas.
  return { sent: false, reason: "DOMIA_NOT_CONFIGURED" };
}

module.exports = { getStudentName, prepareDomiaRecord, sendToDomia };

