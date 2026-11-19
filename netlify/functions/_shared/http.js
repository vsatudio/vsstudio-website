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

function getSiteUrl(event) {
  const configuredUrl = process.env.SITE_URL || process.env.URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  if (origin) {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin;
    }
  }

  throw new Error("SITE_URL no está configurada.");
}

module.exports = { json, parseJsonBody, getSiteUrl };

