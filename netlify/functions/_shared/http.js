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

function normalizeHttpsOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch (error) {
    return null;
  }
}

function getHeader(headers, name) {
  if (!headers) return null;
  const expectedName = name.toLowerCase();
  for (const [headerName, value] of Object.entries(headers)) {
    if (headerName.toLowerCase() === expectedName && typeof value === "string") return value.trim();
  }
  return null;
}

function getSiteName() {
  const siteName = (process.env.SITE_NAME || "").toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(siteName) ? siteName : null;
}

function isAllowedSiteOrigin(value) {
  const origin = normalizeHttpsOrigin(value);
  if (!origin) return false;

  const productionOrigin = normalizeHttpsOrigin(process.env.URL);
  if (productionOrigin && origin === productionOrigin) return true;

  const siteName = getSiteName();
  if (!siteName) return false;

  const hostname = new URL(origin).hostname;
  const netlifyHostname = `${siteName}.netlify.app`;
  const deploySuffix = `--${netlifyHostname}`;
  return hostname === netlifyHostname ||
    (hostname.endsWith(deploySuffix) && hostname.length > deploySuffix.length);
}

function getSiteUrl(event) {
  const headers = event.headers || {};
  const requestOrigin = getHeader(headers, "origin");
  if (requestOrigin) {
    if (isAllowedSiteOrigin(requestOrigin)) return normalizeHttpsOrigin(requestOrigin);
    throw new Error("El origen de la solicitud no está autorizado.");
  }

  const forwardedProtocol = getHeader(headers, "x-forwarded-proto");
  if (forwardedProtocol && forwardedProtocol.toLowerCase() !== "https") {
    throw new Error("El protocolo de la solicitud no está autorizado.");
  }

  const requestHost = getHeader(headers, "x-forwarded-host") || getHeader(headers, "host");
  const hostOrigin = requestHost ? `https://${requestHost}` : null;
  if (hostOrigin && isAllowedSiteOrigin(hostOrigin)) return normalizeHttpsOrigin(hostOrigin);

  throw new Error("El origen de la solicitud no está autorizado.");
}

module.exports = { json, parseJsonBody, getSiteUrl, isAllowedSiteOrigin, normalizeHttpsOrigin };
