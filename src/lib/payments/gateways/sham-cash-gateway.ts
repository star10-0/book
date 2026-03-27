import { PaymentProvider } from "@prisma/client";
import { createMockPaymentResult, verifyMockPaymentResult } from "@/lib/payments/gateways/mock-payment-gateway";
import {
  extractFailureReason,
  GatewayConfigurationError,
  GatewayRequestError,
  isPaidStatus,
  readOptionalTimeoutMs,
  readRequiredEnv,
  safeLogProviderResponse,
} from "@/lib/payments/gateways/provider-http";
import { getShamCashIntegrationConfig } from "@/lib/payments/gateways/provider-integration";
import { isMockPaymentGatewayEnabled } from "@/lib/payments/mock-mode";
import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  PaymentGateway,
  VerifyPaymentGatewayInput,
  VerifyPaymentGatewayResult,
} from "@/lib/payments/gateways/payment-gateway";

function getShamCashLiveConfig() {
  return {
    baseUrl: readRequiredEnv("SHAM_CASH_API_BASE_URL"),
    apiKey: readRequiredEnv("SHAM_CASH_API_KEY"),
    destinationAccount: readRequiredEnv("SHAM_CASH_DESTINATION_ACCOUNT"),
    timeoutMs: readOptionalTimeoutMs("SHAM_CASH_TIMEOUT_MS"),
  };
}

function pickString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function pickNumber(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseInt(value.trim(), 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

export class ShamCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SHAM_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    const integration = getShamCashIntegrationConfig();

    if (integration.mode !== "live") {
      if (!isMockPaymentGatewayEnabled()) {
        throw new GatewayConfigurationError("Mock payment gateways are disabled outside explicit development/test mode.");
      }
      return createMockPaymentResult("sham", input);
    }

    if (!integration.isLiveConfigured) {
      throw new GatewayConfigurationError("Sham Cash live integration is not fully configured.");
    }

    const config = getShamCashLiveConfig();
    const providerReference = `sham-manual:${input.paymentId}`;

    return {
      providerReference,
      rawPayload: {
        mode: "live-manual",
        providerReference,
        destinationAccount: config.destinationAccount,
        amountCents: input.amountCents,
        currency: input.currency,
        orderReference: input.orderId,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult> {
    const integration = getShamCashIntegrationConfig();

    if (integration.mode !== "live") {
      if (!isMockPaymentGatewayEnabled()) {
        throw new GatewayConfigurationError("Mock payment gateways are disabled outside explicit development/test mode.");
      }
      return verifyMockPaymentResult("Sham Cash", input);
    }

    if (!integration.isLiveConfigured) {
      throw new GatewayConfigurationError("Sham Cash live integration is not fully configured.");
    }

    if (!input.transactionReference?.trim()) {
      throw new GatewayRequestError({
        provider: "sham_cash",
        phase: "verify",
        message: "Sham Cash verification requires a submitted transaction reference.",
      });
    }

    const config = getShamCashLiveConfig();
    const payload = await findShamCashTransaction({
      config,
      transactionReference: input.transactionReference.trim(),
    });

    const verifiedAmountCents = pickNumber(payload, ["amountCents", "amount"]);
    const verifiedCurrency = pickString(payload, ["currency"]);
    const verifiedDestination = pickString(payload, ["account_address", "destinationAccount", "receiverAccount", "merchantAccount"]);

    if (typeof verifiedAmountCents === "number" && verifiedAmountCents !== input.expectedAmountCents) {
      throw new GatewayRequestError({
        provider: "sham_cash",
        phase: "verify",
        message: "Sham Cash verify response amount does not match expected amount.",
      });
    }

    if (verifiedCurrency && verifiedCurrency.toUpperCase() !== input.expectedCurrency.toUpperCase()) {
      throw new GatewayRequestError({
        provider: "sham_cash",
        phase: "verify",
        message: "Sham Cash verify response currency does not match expected currency.",
      });
    }

    if (verifiedDestination && verifiedDestination !== config.destinationAccount) {
      throw new GatewayRequestError({
        provider: "sham_cash",
        phase: "verify",
        message: "Sham Cash verify response destination account mismatch.",
      });
    }

    const isPaid = isPaidStatus(payload);

    return {
      isPaid,
      rawPayload: {
        mode: "live",
        ...payload,
      },
      failureReason: isPaid ? undefined : extractFailureReason(payload) ?? "Sham Cash reported an unsuccessful transaction status.",
    };
  }
}

async function findShamCashTransaction(input: {
  config: ReturnType<typeof getShamCashLiveConfig>;
  transactionReference: string;
}): Promise<Record<string, unknown>> {
  const endpoint = new URL(input.config.baseUrl);
  endpoint.searchParams.set("resource", "shamcash");
  endpoint.searchParams.set("action", "find_tx");
  endpoint.searchParams.set("tx", input.transactionReference);
  endpoint.searchParams.set("account_address", input.config.destinationAccount);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "X-Api-Key": input.config.apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const textPayload = await response.text();
    const payload = parsePayload(textPayload);
    const normalizedPayload = unwrapDataContainer(payload);

    safeLogProviderResponse("sham_cash", "verify", {
      status: response.status,
      ok: response.ok,
      payload: normalizedPayload,
    });

    if (!response.ok) {
      throw new GatewayRequestError({
        provider: "sham_cash",
        phase: "verify",
        statusCode: response.status,
        message: `Provider API request failed with status ${response.status}.`,
      });
    }

    return normalizedPayload;
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayRequestError({
        provider: "sham_cash",
        phase: "verify",
        message: `Provider API request timed out after ${input.config.timeoutMs}ms.`,
      });
    }

    throw new GatewayRequestError({
      provider: "sham_cash",
      phase: "verify",
      message: "Provider API request failed unexpectedly.",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parsePayload(value: string): Record<string, unknown> {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { data: parsed };
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {
      raw: value,
    };
  }
}

function unwrapDataContainer(payload: Record<string, unknown>) {
  const nested = payload.data;

  if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
    return payload;
  }

  return nested as Record<string, unknown>;
}
