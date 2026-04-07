import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readOptionalServerEnv, readRequiredServerEnv } from "@/lib/env";

export type ProtectedDisposition = "inline" | "attachment";

const PROTECTED_ASSET_TOKEN_COOKIE = "__Host-book-pa";
const PROTECTED_ASSET_HANDOFF_NONCE_COOKIE = "__Host-book-pa-nonce";

type ProtectedAssetTokenPayload = {
  fid: string;
  exp: number;
  uid?: string;
  aid?: string;
  sid?: string;
  dsp: ProtectedDisposition;
  wm?: string;
  jti: string;
};

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

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSigningSecret()).update(encodedPayload).digest("base64url");
}

function signWithSecret(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function clampTokenLifetime(seconds: number | undefined) {
  return Math.max(30, Math.min(seconds ?? 180, 300));
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = header.slice("bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function readCookieToken(request: Request) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) {
    return null;
  }

  const entries = rawCookie.split(";");
  for (const entry of entries) {
    const [name, ...valueParts] = entry.trim().split("=");
    if (name === PROTECTED_ASSET_TOKEN_COOKIE) {
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

export function resolveProtectedAssetToken(request: Request, url: URL, options?: { allowQueryToken?: boolean }) {
  const fromHeaderOrCookie = readBearerToken(request) ?? readCookieToken(request);
  if (fromHeaderOrCookie) {
    return fromHeaderOrCookie;
  }

  return options?.allowQueryToken ? url.searchParams.get("t") : null;
}

export function resolveProtectedAssetNonce(request: Request) {
  return readNamedCookie(request, PROTECTED_ASSET_HANDOFF_NONCE_COOKIE);
}

export function createProtectedAssetToken(input: {
  fileId: string;
  disposition: ProtectedDisposition;
  expiresInSeconds?: number;
  userId?: string;
  accessGrantId?: string;
  readingSessionId?: string;
  watermarkText?: string;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: ProtectedAssetTokenPayload = {
    fid: input.fileId,
    uid: input.userId,
    aid: input.accessGrantId,
    sid: input.readingSessionId,
    dsp: input.disposition,
    wm: input.watermarkText,
    exp: nowSeconds + clampTokenLifetime(input.expiresInSeconds),
    jti: randomUUID(),
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyProtectedAssetToken(input: {
  token: string | null;
  fileId: string;
  disposition: ProtectedDisposition;
  currentUserId?: string | null;
  expectedNonce?: string | null;
  expectedSessionId?: string | null;
}) {
  if (!input.token) {
    return { valid: false as const, reason: "MISSING_TOKEN" as const };
  }

  const [encoded, signature] = input.token.split(".");

  if (!encoded || !signature) {
    return { valid: false as const, reason: "MALFORMED_TOKEN" as const };
  }

  const secret = getSigningSecretOrNull();
  if (!secret) {
    return { valid: false as const, reason: "SIGNING_SECRET_UNSET" as const };
  }

  if (!secureEqual(signWithSecret(encoded, secret), signature)) {
    return { valid: false as const, reason: "INVALID_SIGNATURE" as const };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as ProtectedAssetTokenPayload;

    if (payload.fid !== input.fileId || payload.dsp !== input.disposition) {
      return { valid: false as const, reason: "MISMATCH" as const };
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return { valid: false as const, reason: "TOKEN_EXPIRED" as const };
    }

    if (payload.uid && input.currentUserId && payload.uid !== input.currentUserId) {
      return { valid: false as const, reason: "WRONG_USER" as const };
    }

    if (input.expectedNonce && payload.jti !== input.expectedNonce) {
      return { valid: false as const, reason: "NONCE_MISMATCH" as const };
    }

    if (input.expectedSessionId && payload.sid !== input.expectedSessionId) {
      return { valid: false as const, reason: "SESSION_MISMATCH" as const };
    }

    return { valid: true as const, payload };
  } catch {
    return { valid: false as const, reason: "INVALID_PAYLOAD" as const };
  }
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

  return `book|${markers.join("|")}`;
}

export function buildProtectedAssetUrl(input: {
  fileId: string;
  disposition: ProtectedDisposition;
  userId?: string;
  accessGrantId?: string;
  readingSessionId?: string;
  watermarkText?: string | null;
}) {
  const token = createProtectedAssetToken({
    fileId: input.fileId,
    disposition: input.disposition,
    userId: input.userId,
    accessGrantId: input.accessGrantId,
    readingSessionId: input.readingSessionId,
    watermarkText: input.watermarkText ?? undefined,
  });

  const handoffPath = `/api/books/assets/${input.fileId}/handoff`;
  const dispositionQuery = input.disposition === "attachment" ? "&download=1" : "";
  return `${handoffPath}?t=${encodeURIComponent(token)}${dispositionQuery}`;
}

export function getProtectedAssetTokenCookieName() {
  return PROTECTED_ASSET_TOKEN_COOKIE;
}

export function getProtectedAssetNonceCookieName() {
  return PROTECTED_ASSET_HANDOFF_NONCE_COOKIE;
}
