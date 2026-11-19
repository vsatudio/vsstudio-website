"use strict";

function json(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }, extraHeaders || {}),
    body: JSON.stringify(payload)
  };
}

function parseJsonBody(event) {
  if (!event.body) return {};
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(body);
}

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch (error) {
    return null;
  }
}

function isLocalOrigin(origin) {
  if (!origin) return false;
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getSiteUrl(event) {
  const context = process.env.CONTEXT || "";
  const productionOrigin = normalizeOrigin(process.env.SITE_URL || process.env.URL);
  const deployPreviewOrigin = normalizeOrigin(process.env.DEPLOY_PRIME_URL);
  const deployOrigin = normalizeOrigin(process.env.DEPLOY_URL);
  const trustedOrigins = new Set([
    productionOrigin,
    deployPreviewOrigin,
    deployOrigin
  ].filter(Boolean));

  const requestOriginValue = event.headers && (event.headers.origin || event.headers.Origin);
  if (requestOriginValue) {
    const requestOrigin = normalizeOrigin(requestOriginValue);
    const localDevelopment = requestOrigin && isLocalOrigin(requestOrigin) &&
      (context === "dev" || (!productionOrigin && !deployPreviewOrigin && !deployOrigin));

    if (requestOrigin && (trustedOrigins.has(requestOrigin) || localDevelopment)) {
      return requestOrigin;
    }
    throw new Error("El origen de la solicitud no está autorizado.");
  }

  if (context === "deploy-preview" || context === "branch-deploy") {
    if (deployPreviewOrigin || deployOrigin) return deployPreviewOrigin || deployOrigin;
  }
  if (productionOrigin) return productionOrigin;
  if (deployPreviewOrigin || deployOrigin) return deployPreviewOrigin || deployOrigin;

  throw new Error("No se pudo determinar una URL segura para el sitio.");
}

module.exports = { json, parseJsonBody, getSiteUrl, normalizeOrigin };
