"use strict";

const Stripe = require("stripe");

let stripeClient;

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY no está configurada.");
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("FASE 1 solo admite una STRIPE_SECRET_KEY de modo test.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

module.exports = { getStripe };

