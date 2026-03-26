import { createHmac, timingSafeEqual } from "node:crypto";
import { GatewayConfigurationError } from "@/lib/payments/gateways/provider-http";

export type ShamCashCallbackPayload = {
  providerReference?: string;
  paymentReference?: string;
  transactionReference?: string;
  status?: string;
};

function normalizeSignature(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("sha256=") ? trimmed.slice("sha256=".length) : trimmed;
}

export function verifyShamCashCallbackSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string | undefined;
  timestampHeader?: string | null;
  maxSkewMs?: number;
}) {
  if (!input.webhookSecret) {
    throw new GatewayConfigurationError("SHAM_CASH_WEBHOOK_SECRET is required for callback verification.");
  }

  if (!input.signatureHeader) {
    return false;
  }

  const maxSkewMs = input.maxSkewMs ?? 5 * 60_000;
  const timestampHeader = input.timestampHeader?.trim();
  if (!timestampHeader) {
    return false;
  }

  const parsedTimestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  const timestampMs = parsedTimestamp > 10_000_000_000 ? parsedTimestamp : parsedTimestamp * 1000;
  if (Math.abs(Date.now() - timestampMs) > maxSkewMs) {
    return false;
  }

  const providedSignature = normalizeSignature(input.signatureHeader);
  const timestampedPayload = `${timestampHeader}.${input.rawBody}`;
  const expectedSignature = createHmac("sha256", input.webhookSecret).update(timestampedPayload, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(providedSignature, "hex"), Buffer.from(expectedSignature, "hex"));
  } catch {
    return false;
  }
}

export function parseShamCashCallbackPayload(rawBody: string): ShamCashCallbackPayload {
  if (!rawBody.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(rawBody);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ShamCashCallbackPayload;
  } catch {
    return {};
  }
}

export function extractShamCashProviderReference(payload: ShamCashCallbackPayload): string | undefined {
  const candidate = [payload.providerReference, payload.paymentReference].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return candidate?.trim();
}
