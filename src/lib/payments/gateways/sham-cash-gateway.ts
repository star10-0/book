import "server-only";
import { PaymentProvider } from "@prisma/client";
import { logInfo } from "@/lib/observability/logger";
import { createMockPaymentResult, verifyMockPaymentResult } from "@/lib/payments/gateways/mock-payment-gateway";
import {
  extractFailureReason,
  GatewayConfigurationError,
  GatewayRequestError,
  isPaidStatus,
  readOptionalTimeoutMs,
  readRequiredEnv,
  safeLogProviderResponse,
  sanitizeForLogs,
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
      const parsed = Number.parseFloat(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function normalizeShamCashPayload(payload: Record<string, unknown>) {
  const transaction = asRecord(payload.transaction);
  const account = asRecord(payload.account);
  const majorAmount = pickNumber(transaction ?? payload, ["amount"]);
  const amountCents = pickNumber(transaction ?? payload, ["amountCents"]);
  const destinationAccountFromTransaction =
    pickString(transaction ?? payload, ["to_account", "to", "account_address", "destinationAccount", "receiverAccount", "merchantAccount"])
    ?? pickString(account ?? payload, ["account_address", "address", "destinationAccount"]);
  const normalizedAmountCents = normalizeAmountCents({ majorAmount, amountCents });

  return {
    found: payload.found === true,
    hasTransaction: Boolean(transaction),
    hasAccount: Boolean(account),
    transactionId: pickNumber(transaction ?? payload, ["tran_id", "tx", "transaction_id", "id"]),
    amountCents: normalizedAmountCents,
    currency: pickString(transaction ?? payload, ["currency"]),
    destination: destinationAccountFromTransaction,
  };
}

function normalizeComparable(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  return value.trim().toLowerCase();
}

function normalizeAmountCents(input: {
  majorAmount: number | undefined;
  amountCents: number | undefined;
}): number | undefined {
  if (typeof input.amountCents === "number") {
    const roundedCents = Math.round(input.amountCents);
    if (Number.isSafeInteger(roundedCents)) {
      return roundedCents;
    }
  }

  if (typeof input.majorAmount !== "number") {
    return undefined;
  }

  const converted = Math.round(input.majorAmount * 100);
  if (!Number.isSafeInteger(converted)) {
    return undefined;
  }

  return converted;
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
    const verificationResponse = await findShamCashTransaction({
      config,
      transactionReference: input.transactionReference.trim(),
    });
    const payload = verificationResponse.normalizedPayload;

    const normalized = normalizeShamCashPayload(payload);

    const verifiedAmountCents = normalized.amountCents;
    const verifiedCurrency = normalized.currency;
    const verifiedDestination = normalized.destination;
    const amountMatches = typeof verifiedAmountCents === "number" && verifiedAmountCents === input.expectedAmountCents;
    const currencyMatches = typeof verifiedCurrency === "string" && verifiedCurrency.toUpperCase() === input.expectedCurrency.toUpperCase();
    const destinationMatches =
      typeof verifiedDestination === "string"
      && normalizeComparable(verifiedDestination) === normalizeComparable(config.destinationAccount);

    const mismatchReasons: string[] = [];

    if (typeof verifiedAmountCents === "number" && !amountMatches) {
      mismatchReasons.push("Sham Cash verify response amount does not match expected amount.");
    }

    if (verifiedCurrency && !currencyMatches) {
      mismatchReasons.push("Sham Cash verify response currency does not match expected currency.");
    }

    if (verifiedDestination && !destinationMatches) {
      mismatchReasons.push("Sham Cash verify response destination account mismatch.");
    }

    const isPaid = normalized.found
      && normalized.hasTransaction
      && normalized.hasAccount
      && amountMatches
      && currencyMatches
      && destinationMatches
      && isPaidStatus(payload);

    const unpaidReason =
      mismatchReasons[0]
      ?? extractFailureReason(payload)
      ?? (!normalized.found ? "Sham Cash did not find the submitted transaction reference." : undefined)
      ?? (!normalized.hasTransaction ? "Sham Cash verify response did not include transaction details." : undefined)
      ?? (!normalized.hasAccount ? "Sham Cash verify response did not include destination account details." : undefined)
      ?? (!amountMatches ? "Sham Cash verify response amount does not match expected amount." : undefined)
      ?? (!currencyMatches ? "Sham Cash verify response currency does not match expected currency." : undefined)
      ?? (!destinationMatches ? "Sham Cash verify response destination account mismatch." : undefined)
      ?? "Sham Cash reported an unsuccessful transaction status.";

    logInfo("Sham Cash verification decision", {
      provider: "sham_cash",
      phase: "verify",
      endpointBase: verificationResponse.endpointBase,
      responseStatus: verificationResponse.responseStatus,
      rawPayload: sanitizeForLogs(verificationResponse.rawPayload),
      normalizedPayload: sanitizeForLogs(payload),
      expected: {
        amountCents: input.expectedAmountCents,
        currency: input.expectedCurrency,
        destinationAccount: config.destinationAccount,
      },
      normalizedValues: {
        found: normalized.found,
        hasTransaction: normalized.hasTransaction,
        hasAccount: normalized.hasAccount,
        amountCents: verifiedAmountCents,
        currency: verifiedCurrency,
        destination: verifiedDestination,
      },
      comparisons: {
        amountMatches,
        currencyMatches,
        destinationMatches,
      },
      isPaid,
      reason: isPaid ? "All paid conditions matched." : unpaidReason,
    });

    return {
      isPaid,
      rawPayload: {
        mode: "live",
        ...payload,
      },
      failureReason: isPaid ? undefined : unpaidReason,
    };
  }
}

async function findShamCashTransaction(input: {
  config: ReturnType<typeof getShamCashLiveConfig>;
  transactionReference: string;
}): Promise<{
  endpointBase: string;
  responseStatus: number;
  rawPayload: Record<string, unknown>;
  normalizedPayload: Record<string, unknown>;
}> {
  const endpoint = new URL(input.config.baseUrl);
  endpoint.searchParams.set("resource", "shamcash");
  endpoint.searchParams.set("action", "find_tx");
  endpoint.searchParams.set("tx", input.transactionReference);
  endpoint.searchParams.set("transaction_id", input.transactionReference);
  endpoint.searchParams.set("account_address", input.config.destinationAccount);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);

  try {
    logInfo("Sham Cash verify request", {
      provider: "sham_cash",
      phase: "verify",
      endpointBase: endpoint.origin + endpoint.pathname,
      requestShape: {
        method: "GET",
        query: {
          resource: "shamcash",
          action: "find_tx",
          tx: input.transactionReference,
          transaction_id: input.transactionReference,
          account_address: input.config.destinationAccount,
        },
      },
    });

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

    return {
      endpointBase: endpoint.origin + endpoint.pathname,
      responseStatus: response.status,
      rawPayload: payload,
      normalizedPayload,
    };
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
