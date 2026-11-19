"use strict";

const { getStripe } = require("./_shared/stripe-client");
const { getCourse, calculatePayment, buildMetadata, CURRENCY } = require("./_shared/course-catalog");
const { json, parseJsonBody, getSiteUrl } = require("./_shared/http");

function buildCheckoutUrls(siteUrl, coursePage) {
  return {
    successUrl: `${siteUrl}/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${siteUrl}${coursePage}#pago-curso`
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido." }, { Allow: "POST" });
  }

  let input;
  try {
    input = parseJsonBody(event);
  } catch (error) {
    return json(400, { error: "El cuerpo de la solicitud no es JSON válido." });
  }

  const course = getCourse(input.courseId);
  const payment = calculatePayment(course, input.paymentType);
  if (!course || !payment) {
    return json(400, { error: "Curso o modalidad de pago no válidos." });
  }

  try {
    const stripe = getStripe();
    const siteUrl = getSiteUrl(event);
    const checkoutUrls = buildCheckoutUrls(siteUrl, course.page);
    const metadata = buildMetadata(course, input.paymentType, payment);
    const concept = input.paymentType === "deposit" ? "Reserva 30%" : "Pago completo";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      custom_fields: [{
        key: "student_name",
        label: { type: "custom", custom: "Nombre y apellidos de la alumna" },
        type: "text",
        optional: false
      }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: payment.amountPaidCents,
          product_data: {
            name: `${concept} — ${course.name}`,
            description: input.paymentType === "deposit"
              ? `Reserva del 30%. Saldo pendiente: ${(payment.remainingCents / 100).toFixed(2)} EUR.`
              : "Pago completo del curso."
          }
        }
      }],
      metadata,
      payment_intent_data: { metadata },
      success_url: checkoutUrls.successUrl,
      cancel_url: checkoutUrls.cancelUrl,
      locale: "es"
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error("No se pudo crear la sesión de Checkout:", error.message);
    return json(500, { error: "No se pudo iniciar el pago. Inténtalo de nuevo." });
  }
};

module.exports.buildCheckoutUrls = buildCheckoutUrls;
