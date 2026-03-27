import { PaymentProvider } from "@prisma/client";
import { createMockPaymentResult, verifyMockPaymentResult } from "@/lib/payments/gateways/mock-payment-gateway";
import {
  extractFailureReason,
  extractProviderReference,
  GatewayConfigurationError,
  GatewayRequestError,
  isPaidStatus,
  postProviderJson,
  readOptionalTimeoutMs,
  readRequiredEnv,
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

function buildSyriatelEndpoint(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

function getSyriatelCashLiveConfig() {
  return {
    baseUrl: readRequiredEnv("SYRIATEL_CASH_API_BASE_URL"),
    apiKey: readRequiredEnv("SYRIATEL_CASH_API_KEY"),
    merchantId: readRequiredEnv("SYRIATEL_CASH_MERCHANT_ID"),
    createPath: readRequiredEnv("SYRIATEL_CASH_CREATE_PAYMENT_PATH"),
    verifyPath: readRequiredEnv("SYRIATEL_CASH_VERIFY_PAYMENT_PATH"),
    destinationAccount: readRequiredEnv("SYRIATEL_CASH_DESTINATION_ACCOUNT"),
    timeoutMs: readOptionalTimeoutMs("SYRIATEL_CASH_TIMEOUT_MS"),
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

    const payload = await postProviderJson({
      provider: "syriatel_cash",
      phase: "create",
      endpoint: buildSyriatelEndpoint(config.baseUrl, config.createPath),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-Merchant-Id": config.merchantId,
      },
      body: {
        merchantId: config.merchantId,
        paymentId: input.paymentId,
        orderId: input.orderId,
        amountCents: input.amountCents,
        currency: input.currency,
        destinationAccount: config.destinationAccount,
        customerId: input.customerId,
      },
      timeoutMs: config.timeoutMs,
    });

    const providerReference = extractProviderReference(payload);
    if (!providerReference) {
      throw new GatewayConfigurationError("Syriatel Cash create response did not include a provider reference.");
    }

    const echoedAmountCents = pickNumber(payload, ["amountCents", "amount"]);
    const echoedCurrency = pickString(payload, ["currency"]);
    const echoedDestination = pickString(payload, ["destinationAccount", "receiverAccount", "merchantAccount"]);

    if (typeof echoedAmountCents === "number" && echoedAmountCents !== input.amountCents) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "create",
        message: "Syriatel Cash create response amount does not match order total.",
      });
    }

    if (echoedCurrency && echoedCurrency.toUpperCase() !== input.currency.toUpperCase()) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "create",
        message: "Syriatel Cash create response currency does not match order currency.",
      });
    }

    if (echoedDestination && echoedDestination !== config.destinationAccount) {
      throw new GatewayRequestError({
        provider: "syriatel_cash",
        phase: "create",
        message: "Syriatel Cash create response destination account mismatch.",
      });
    }

    const checkoutUrl = [payload.checkoutUrl, payload.paymentUrl, payload.redirectUrl].find(
      (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0,
    );

    return {
      providerReference,
      checkoutUrl,
      rawPayload: {
        mode: "live",
        ...payload,
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

    const config = getSyriatelCashLiveConfig();
    const payload = await postProviderJson({
      provider: "syriatel_cash",
      phase: "verify",
      endpoint: buildSyriatelEndpoint(config.baseUrl, config.verifyPath),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-Merchant-Id": config.merchantId,
      },
      body: {
        merchantId: config.merchantId,
        paymentId: input.paymentId,
        providerReference: input.providerReference,
        transactionReference: input.transactionReference,
        amountCents: input.expectedAmountCents,
        currency: input.expectedCurrency,
        destinationAccount: config.destinationAccount,
      },
      timeoutMs: config.timeoutMs,
    });

    const verifiedAmountCents = pickNumber(payload, ["amountCents", "amount"]);
    const verifiedCurrency = pickString(payload, ["currency"]);
    const verifiedDestination = pickString(payload, ["destinationAccount", "receiverAccount", "merchantAccount"]);

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
      failureReason: isPaid ? undefined : extractFailureReason(payload) ?? "Syriatel Cash reported an unsuccessful payment status.",
    };
  }
}
