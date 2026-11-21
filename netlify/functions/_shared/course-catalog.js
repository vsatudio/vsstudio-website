"use strict";

const CURRENCY = "eur";
const SCHEMA_VERSION = "vsstudio-checkout-v1";

const courses = Object.freeze({
  "manicura-profesional": Object.freeze({
    id: "manicura-profesional",
    name: "Curso de Manicura Profesional",
    totalCents: 25000,
    page: "/curso-manicura-profesional-madrid.html"
  }),
  "masterclass-nail-art": Object.freeze({
    id: "masterclass-nail-art",
    name: "Masterclass de Nail Art",
    totalCents: 9900,
    page: "/masterclass-nail-art-madrid.html"
  }),
  "extensiones-pestanas-profesional": Object.freeze({
    id: "extensiones-pestanas-profesional",
    name: "Curso Profesional de Extensiones de Pestañas",
    totalCents: 35000,
    page: "/curso-extensiones-pestanas-madrid.html"
  }),
  "masterclass-extensiones-pestanas": Object.freeze({
    id: "masterclass-extensiones-pestanas",
    name: "Masterclass Intensiva de Extensiones de Pestañas",
    totalCents: 20000,
    page: "/masterclass-extensiones-pestanas-madrid.html"
  }),
  "lifting-pestanas": Object.freeze({
    id: "lifting-pestanas",
    name: "Curso de Lifting de Pestañas",
    totalCents: 18000,
    page: "/curso-lifting-pestanas-madrid.html"
  }),
  "diseno-cejas-tinte": Object.freeze({
    id: "diseno-cejas-tinte",
    name: "Curso de Diseño de Cejas y Tinte",
    totalCents: 18000,
    page: "/curso-diseno-cejas-tinte-madrid.html"
  }),
  microblading: Object.freeze({
    id: "microblading",
    name: "Curso de Microblading",
    totalCents: 35000,
    page: "/curso-microblading-madrid.html"
  })
});

function getCourse(courseId) {
  return Object.prototype.hasOwnProperty.call(courses, courseId) ? courses[courseId] : null;
}

function calculatePayment(course, paymentType) {
  if (!course || (paymentType !== "deposit" && paymentType !== "full")) {
    return null;
  }

  const amountPaidCents = paymentType === "deposit"
    ? Math.round((course.totalCents * 30) / 100)
    : course.totalCents;

  return Object.freeze({
    totalCents: course.totalCents,
    amountPaidCents,
    remainingCents: course.totalCents - amountPaidCents
  });
}

function buildMetadata(course, paymentType, payment) {
  return {
    courseId: course.id,
    courseName: course.name,
    totalPrice: String(payment.totalCents),
    paymentType,
    amountPaid: String(payment.amountPaidCents),
    remainingAmount: String(payment.remainingCents),
    currency: CURRENCY.toUpperCase(),
    schemaVersion: SCHEMA_VERSION
  };
}

module.exports = {
  CURRENCY,
  SCHEMA_VERSION,
  courses,
  getCourse,
  calculatePayment,
  buildMetadata
};

