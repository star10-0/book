import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type ProtectedDisposition = "inline" | "attachment";

type ProtectedAssetTokenPayload = {
  fid: string;
  exp: number;
  uid?: string;
  aid?: string;
  dsp: ProtectedDisposition;
  wm?: string;
  jti: string;
};

function getSigningSecret() {
  return process.env.AUTH_SECRET?.trim() || "book-dev-content-protection-secret";
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

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createProtectedAssetToken(input: {
  fileId: string;
  disposition: ProtectedDisposition;
  expiresInSeconds?: number;
  userId?: string;
  accessGrantId?: string;
  watermarkText?: string;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: ProtectedAssetTokenPayload = {
    fid: input.fileId,
    uid: input.userId,
    aid: input.accessGrantId,
    dsp: input.disposition,
    wm: input.watermarkText,
    exp: nowSeconds + Math.max(30, Math.min(input.expiresInSeconds ?? 300, 900)),
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
}) {
  if (!input.token) {
    return { valid: false as const, reason: "MISSING_TOKEN" as const };
  }

  const [encoded, signature] = input.token.split(".");

  if (!encoded || !signature) {
    return { valid: false as const, reason: "MALFORMED_TOKEN" as const };
  }

  if (!secureEqual(sign(encoded), signature)) {
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
  watermarkText?: string | null;
}) {
  const token = createProtectedAssetToken({
    fileId: input.fileId,
    disposition: input.disposition,
    userId: input.userId,
    accessGrantId: input.accessGrantId,
    watermarkText: input.watermarkText ?? undefined,
  });

  return `/api/books/assets/${input.fileId}?t=${encodeURIComponent(token)}`;
}
