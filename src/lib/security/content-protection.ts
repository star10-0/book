import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { readOptionalServerEnv, readRequiredServerEnv } from "@/lib/env";

export type ProtectedDisposition = "inline" | "attachment";

const isProduction = process.env.NODE_ENV === "production";
const PROTECTED_ASSET_SESSION_COOKIE_ASSETS = isProduction ? "__Secure-book-pa-s-a" : "book-pa-s-a";
const PROTECTED_ASSET_SESSION_COOKIE_EPUB = isProduction ? "__Secure-book-pa-s-e" : "book-pa-s-e";
const PROTECTED_ASSET_HANDOFF_TICKET_COOKIE = isProduction ? "__Secure-book-pa-ht" : "book-pa-ht";

type CookieName = "session-assets" | "session-epub" | "handoff";

function getSigningSecret() {
  try {
    return readRequiredServerEnv("AUTH_SECRET");
  } catch {
    throw new Error("AUTH_SECRET is required for content-protection token signing.");
  }
}

function getSigningSecretOrNull() {
  return readOptionalServerEnv("AUTH_SECRET") ?? null;
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = header.slice("bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function readNamedCookie(request: Request, cookieName: string) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) {
    return null;
  }

  for (const entry of rawCookie.split(";")) {
    const [name, ...valueParts] = entry.trim().split("=");
    if (name === cookieName) {
      const value = valueParts.join("=").trim();
      if (!value) return null;
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

function resolveCookieName(kind: CookieName) {
  if (kind === "session-assets") {
    return PROTECTED_ASSET_SESSION_COOKIE_ASSETS;
  }

  if (kind === "session-epub") {
    return PROTECTED_ASSET_SESSION_COOKIE_EPUB;
  }

  return PROTECTED_ASSET_HANDOFF_TICKET_COOKIE;
}

export function resolveOpaqueHandleFromRequest(request: Request, kind: CookieName) {
  const fromHeader = readBearerToken(request);
  if (fromHeader) {
    return fromHeader;
  }

  return readNamedCookie(request, resolveCookieName(kind));
}

export function createOpaqueHandle(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

export function hashOpaqueHandle(handle: string) {
  const secret = getSigningSecretOrNull();
  if (!secret) {
    return createHash("sha256").update(handle).digest("hex");
  }

  return createHmac("sha256", secret).update(handle).digest("hex");
}

export function buildWatermarkText(input: {
  email?: string | null;
  userId?: string | null;
  orderId?: string | null;
  accessGrantId?: string | null;
}) {
  const markers = [input.email, input.userId, input.orderId, input.accessGrantId]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .map((value) => value.trim());

  if (markers.length === 0) {
    return null;
  }

  const secret = getSigningSecretOrNull();
  const fingerprintSource = markers.join("|");
  const digest = secret
    ? createHmac("sha256", secret).update(fingerprintSource).digest("hex")
    : createHash("sha256").update(fingerprintSource).digest("hex");

  return `book|wm-v1|${digest.slice(0, 24)}`;
}

export function buildProtectedAssetUrl(input: {
  fileId: string;
  disposition: ProtectedDisposition;
  userId?: string;
  accessGrantId?: string;
  readingSessionId?: string;
  watermarkText?: string | null;
}) {
  const handoffPath = `/api/books/assets/${input.fileId}/handoff`;
  const dispositionQuery = input.disposition === "attachment" ? "?download=1" : "";
  return `${handoffPath}${dispositionQuery}`;
}

export function getProtectedAssetSessionAssetsCookieName() {
  return PROTECTED_ASSET_SESSION_COOKIE_ASSETS;
}

export function getProtectedAssetSessionEpubCookieName() {
  return PROTECTED_ASSET_SESSION_COOKIE_EPUB;
}

export function getProtectedAssetHandoffTicketCookieName() {
  return PROTECTED_ASSET_HANDOFF_TICKET_COOKIE;
}

export function getContentProtectionSecret() {
  return getSigningSecret();
}
