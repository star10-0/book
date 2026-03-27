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
import { getSyriatelCashIntegrationConfig } from "@/lib/payments/gateways/provider-integration";
import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  PaymentGateway,
  VerifyPaymentGatewayInput,
  VerifyPaymentGatewayResult,
} from "@/lib/payments/gateways/payment-gateway";
import { isMockPaymentGatewayEnabled } from "@/lib/payments/mock-mode";

function getSyriatelCashLiveConfig() {
  return {
    baseUrl: readRequiredEnv("SYRIATEL_CASH_API_BASE_URL"),
    apiKey: readRequiredEnv("SYRIATEL_CASH_API_KEY"),
    destinationAccount: readRequiredEnv("SYRIATEL_CASH_DESTINATION_ACCOUNT"),
    findTxPath: process.env.SYRIATEL_CASH_FIND_TX_PATH?.trim() || "/find_tx",
    timeoutMs: readOptionalTimeoutMs("SYRIATEL_CASH_TIMEOUT_MS"),
  };
}

function buildSyriatelEndpoint(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
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

export class SyriatelCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SYRIATEL_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    const integration = getSyriatelCashIntegrationConfig();

    if (integration.mode !== "live") {
      if (!isMockPaymentGatewayEnabled()) {
        throw new GatewayConfigurationError("Mock payment gateways are disabled outside explicit development/test mode.");
      }
      return createMockPaymentResult("syriatel", input);
    }

    if (!integration.isLiveConfigured) {
      throw new GatewayConfigurationError("Syriatel Cash live integration is not fully configured.");
    }

    const config = getSyriatelCashLiveConfig();
    const providerReference = `syriatel-manual:${input.paymentId}`;

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
    const integration = getSyriatelCashIntegrationConfig();

    if (integration.mode !== "live") {
      if (!isMockPaymentGatewayEnabled()) {
        throw new GatewayConfigurationError("Mock payment gateways are disabled outside explicit development/test mode.");
      }
      return verifyMockPaymentResult("Syriatel Cash", input);
    }

    if (!integration.isLiveConfigured) {
      throw new GatewayConfigurationError("Syriatel Cash live integration is not fully configured.");
    }

    if (!input.transactionReference?.trim()) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        message: "Syriatel Cash verification requires a submitted transaction reference.",
      });
    }

    const config = getSyriatelCashLiveConfig();
    const payload = await findSyriatelCashTransaction({
      config,
      transactionReference: input.transactionReference.trim(),
    });

    const verifiedAmountCents = pickNumber(payload, ["amountCents", "amount"]);
    const verifiedCurrency = pickString(payload, ["currency"]);
    const verifiedDestination = pickString(payload, ["to", "destinationAccount", "receiverAccount", "merchantAccount", "gsm"]);

    if (typeof verifiedAmountCents === "number" && verifiedAmountCents !== input.expectedAmountCents) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        message: "Syriatel Cash verify response amount does not match expected amount.",
      });
    }

    if (verifiedCurrency && verifiedCurrency.toUpperCase() !== input.expectedCurrency.toUpperCase()) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        message: "Syriatel Cash verify response currency does not match expected currency.",
      });
    }

    if (verifiedDestination && verifiedDestination !== config.destinationAccount) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        message: "Syriatel Cash verify response destination account mismatch.",
      });
    }

    const isPaid = isPaidStatus(payload);

    return {
      isPaid,
      rawPayload: {
        mode: "live",
        ...payload,
      },
      failureReason: isPaid ? undefined : extractFailureReason(payload) ?? "Syriatel Cash reported an unsuccessful transaction status.",
    };
  }
}

async function findSyriatelCashTransaction(input: {
  config: ReturnType<typeof getSyriatelCashLiveConfig>;
  transactionReference: string;
}): Promise<Record<string, unknown>> {
  const endpoint = buildSyriatelEndpoint(input.config.baseUrl, input.config.findTxPath);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": input.config.apiKey,
      },
      body: JSON.stringify({
        tx: input.transactionReference,
        transactionReference: input.transactionReference,
        account: input.config.destinationAccount,
        destinationAccount: input.config.destinationAccount,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const textPayload = await response.text();
    const payload = parsePayload(textPayload);
    const normalizedPayload = unwrapDataContainer(payload);

    safeLogProviderResponse("syriatel_cash", "verify", {
      status: response.status,
      ok: response.ok,
      payload: normalizedPayload,
    });

    if (!response.ok) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
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
        provider: "syriatel_cash",
        phase: "verify",
        message: `Provider API request timed out after ${input.config.timeoutMs}ms.`,
      });
    }

    throw new GatewayRequestError({
      provider: "syriatel_cash",
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
