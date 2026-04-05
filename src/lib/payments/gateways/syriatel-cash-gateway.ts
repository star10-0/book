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
    timeoutMs: readOptionalTimeoutMs("SYRIATEL_CASH_TIMEOUT_MS"),
  };
}

// Builds API SYRIA verification URL directly from the configured base endpoint.
// The contract is query-param based (resource/action/tx/gsm), without a configurable find_tx path.
function buildSyriatelFindTxEndpoint(input: {
  baseUrl: string;
  transactionReference: string;
  destinationAccount: string;
}) {
  const url = new URL(input.baseUrl);
  url.searchParams.set("resource", "syriatel");
  url.searchParams.set("action", "find_tx");
  url.searchParams.set("tx", input.transactionReference);
  url.searchParams.set("gsm", input.destinationAccount);
  return url.toString();
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

function formatMinorAmountForReason(amountCents: number): string {
  const major = (amountCents / 100).toFixed(2);
  return `${amountCents} cents (${major})`;
}

function isCurrencyRequiredForSyriatelVerify() {
  const configured = process.env.SYRIATEL_CASH_REQUIRE_CURRENCY_ON_VERIFY?.trim().toLowerCase();
  return configured === "1" || configured === "true" || configured === "yes";
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

    const transactionPayload = asRecord(payload.transaction);
    const verifiedAmountCents = normalizeAmountCents({
      amountCents: pickNumber(transactionPayload, ["amountCents"]) ?? pickNumber(payload, ["amountCents"]),
      majorAmount: pickNumber(transactionPayload, ["amount"]) ?? pickNumber(payload, ["amount"]),
    });
    const verifiedCurrency = pickString(payload, ["currency"]);
    const verifiedDestination = pickString(payload, ["to", "gsm", "destinationAccount", "receiverAccount", "merchantAccount"]);
    const amountMatches = typeof verifiedAmountCents === "number" && verifiedAmountCents === input.expectedAmountCents;
    const currencyMatches = typeof verifiedCurrency === "string" && verifiedCurrency.toUpperCase() === input.expectedCurrency.toUpperCase();
    const destinationMatches = typeof verifiedDestination === "string" && verifiedDestination === config.destinationAccount;

    if (typeof verifiedAmountCents === "number" && !amountMatches) {
      const expectedDisplay = formatMinorAmountForReason(input.expectedAmountCents);
      const receivedDisplay = formatMinorAmountForReason(verifiedAmountCents);
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        statusCode: 409,
        message: `قيمة عملية Syriatel Cash لا تطابق المبلغ المتوقع. المتوقع: ${expectedDisplay}، والمستلم: ${receivedDisplay}. (Syriatel Cash verify amount mismatch: expected ${input.expectedAmountCents} cents, received ${verifiedAmountCents} cents.)`,
      });
    }

    if (verifiedCurrency && !currencyMatches) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        statusCode: 409,
        message: "Syriatel Cash verify response currency does not match expected currency.",
      });
    }

    if (!verifiedCurrency && isCurrencyRequiredForSyriatelVerify()) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        statusCode: 409,
        message: "Syriatel Cash verify response did not include currency while strict currency validation is enabled.",
      });
    }

    if (verifiedDestination && !destinationMatches) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "verify",
        statusCode: 409,
        message: "Syriatel Cash verify response destination account mismatch.",
      });
    }

    const isPaid = isPaidStatus(payload);
    const failureReason = extractFailureReason(payload) ?? "Syriatel Cash reported an unsuccessful transaction status.";

    logInfo("Syriatel Cash verification decision", {
      provider: "syriatel_cash",
      phase: "verify",
      expected: {
        amountCents: input.expectedAmountCents,
        currency: input.expectedCurrency,
        destinationAccount: config.destinationAccount,
      },
      normalizedValues: {
        amountCents: verifiedAmountCents,
        currency: verifiedCurrency,
        destination: verifiedDestination,
      },
      comparisons: {
        amountMatches,
        currencyMatches,
        destinationMatches,
        currencyCheckSkipped: !verifiedCurrency,
      },
      isPaid,
      failureReason: isPaid ? undefined : failureReason,
      payload: sanitizeForLogs(payload),
    });

    return {
      isPaid,
      rawPayload: {
        mode: "live",
        ...payload,
      },
      failureReason: isPaid ? undefined : failureReason,
    };
  }
}

async function findSyriatelCashTransaction(input: {
  config: ReturnType<typeof getSyriatelCashLiveConfig>;
  transactionReference: string;
}): Promise<Record<string, unknown>> {
  const endpoint = buildSyriatelFindTxEndpoint({
    baseUrl: input.config.baseUrl,
    transactionReference: input.transactionReference,
    destinationAccount: input.config.destinationAccount,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Api-Key": input.config.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const textPayload = await response.text();
    const payload = parsePayload(textPayload);
    const normalizedPayload = normalizeSyriatelFindTxPayload(payload);

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

function normalizeSyriatelFindTxPayload(payload: Record<string, unknown>) {
  const unwrapped = unwrapDataContainer(payload);
  const transaction = asRecord(unwrapped.transaction);
  const account = asRecord(unwrapped.account);

  return {
    ...unwrapped,
    ...account,
    ...transaction,
    found: unwrapped.found,
    transaction,
    account,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
