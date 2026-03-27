import { PaymentProvider } from "@prisma/client";
import { logError, getClientIp, getRequestId } from "@/lib/observability/logger";
import {
  extractShamCashProviderReference,
  parseShamCashCallbackPayload,
  verifyShamCashCallbackSignature,
} from "@/lib/payments/gateways/sham-cash-callback";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { getShamCashIntegrationConfig } from "@/lib/payments/gateways/provider-integration";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { verifyPaymentByProviderReference } from "@/lib/payments/payment-service";
import { enforceRateLimit, jsonNoStore, rejectRateLimitUnavailable, rejectRateLimited } from "@/lib/security";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientIp = getClientIp(request);

  const rateLimit = await enforceRateLimit({ key: `payments:sham-callback:${clientIp}`, limit: 120, windowMs: 60_000, requireDistributedInProduction: true });
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "RATE_LIMIT_BACKEND_UNAVAILABLE") {
      return rejectRateLimitUnavailable();
    }
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const integration = getShamCashIntegrationConfig();
  if (integration.mode !== "live") {
    return jsonNoStore({ message: "Sham Cash callback endpoint is disabled in mock mode." }, { status: 404 });
  }
  if (!process.env.SHAM_CASH_WEBHOOK_SECRET?.trim()) {
    return jsonNoStore({ message: "Sham Cash callback endpoint is disabled for manual verification mode." }, { status: 404 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-shamcash-signature");
  const timestampHeader = request.headers.get("x-shamcash-timestamp");

  try {
    const isAuthentic = verifyShamCashCallbackSignature({
      rawBody,
      signatureHeader,
      timestampHeader,
      webhookSecret: process.env.SHAM_CASH_WEBHOOK_SECRET?.trim(),
    });

    if (!isAuthentic) {
      return jsonNoStore({ message: "Invalid callback signature." }, { status: 401 });
    }

    const payload = parseShamCashCallbackPayload(rawBody);
    const providerReference = extractShamCashProviderReference(payload);

    if (!providerReference) {
      return jsonNoStore({ message: "Provider reference is required." }, { status: 400 });
    }

    const attempt = await verifyPaymentByProviderReference({
      provider: PaymentProvider.SHAM_CASH,
      providerReference,
    });

    return jsonNoStore({
      message: "Payment callback processed.",
      requestId,
      providerReference,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        verifiedAt: attempt.verifiedAt,
      },
    });
  } catch (error) {
    if (error instanceof GatewayConfigurationError) {
      return jsonNoStore({ message: "Sham Cash callback configuration is incomplete." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      return jsonNoStore({ message: "Unable to reconcile callback with Sham Cash right now." }, { status: 502 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptNotFound)) {
      return jsonNoStore({ message: "Payment attempt not found for this callback reference." }, { status: 404 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptAlreadyVerifying)) {
      return jsonNoStore({ message: "Attempt is already being verified." }, { status: 202 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.missingProviderReference)) {
      return jsonNoStore({ message: "Attempt is missing provider reference." }, { status: 409 });
    }

    logError("Failed to process Sham Cash callback", error, {
      route: "/api/payments/sham-cash/callback",
      requestId,
      ip: clientIp,
    });

    return jsonNoStore({ message: "Failed to process callback." }, { status: 500 });
  }
}
