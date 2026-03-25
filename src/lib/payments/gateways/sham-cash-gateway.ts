import { PaymentProvider } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/env";
import { createMockPaymentResult, verifyMockPaymentResult } from "@/lib/payments/gateways/mock-payment-gateway";
import {
  extractFailureReason,
  extractProviderReference,
  GatewayConfigurationError,
  isPaidStatus,
  postProviderJson,
  readOptionalTimeoutMs,
  readRequiredEnv,
} from "@/lib/payments/gateways/provider-http";
import { getShamCashIntegrationConfig } from "@/lib/payments/gateways/provider-integration";
import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  PaymentGateway,
  VerifyPaymentGatewayInput,
  VerifyPaymentGatewayResult,
} from "@/lib/payments/gateways/payment-gateway";

function buildShamCashEndpoint(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

function getShamCashLiveConfig() {
  return {
    baseUrl: readRequiredEnv("SHAM_CASH_API_BASE_URL"),
    apiKey: readRequiredEnv("SHAM_CASH_API_KEY"),
    merchantId: readRequiredEnv("SHAM_CASH_MERCHANT_ID"),
    createPath: readRequiredEnv("SHAM_CASH_CREATE_PAYMENT_PATH"),
    verifyPath: readRequiredEnv("SHAM_CASH_VERIFY_PAYMENT_PATH"),
    timeoutMs: readOptionalTimeoutMs("SHAM_CASH_TIMEOUT_MS"),
  };
}

export class ShamCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SHAM_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    const integration = getShamCashIntegrationConfig();

    if (integration.mode !== "live") {
      return createMockPaymentResult("sham", input);
    }

    if (!integration.isLiveConfigured) {
      throw new GatewayConfigurationError("Sham Cash live integration is not fully configured.");
    }

    const config = getShamCashLiveConfig();
    const payload = await postProviderJson({
      provider: "sham_cash",
      phase: "create",
      endpoint: buildShamCashEndpoint(config.baseUrl, config.createPath),
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
        customerId: input.customerId,
        callbackUrl: `${getAppBaseUrl()}/api/payments/sham-cash/callback`,
      },
      timeoutMs: config.timeoutMs,
    });

    const providerReference = extractProviderReference(payload);

    if (!providerReference) {
      throw new GatewayConfigurationError("Sham Cash create response did not include a provider reference.");
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
    const integration = getShamCashIntegrationConfig();

    if (integration.mode !== "live") {
      return verifyMockPaymentResult("Sham Cash", input);
    }

    if (!integration.isLiveConfigured) {
      throw new GatewayConfigurationError("Sham Cash live integration is not fully configured.");
    }

    const config = getShamCashLiveConfig();
    const payload = await postProviderJson({
      provider: "sham_cash",
      phase: "verify",
      endpoint: buildShamCashEndpoint(config.baseUrl, config.verifyPath),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-Merchant-Id": config.merchantId,
      },
      body: {
        merchantId: config.merchantId,
        paymentId: input.paymentId,
        providerReference: input.providerReference,
        transactionReference: input.transactionReference,
      },
      timeoutMs: config.timeoutMs,
    });

    const isPaid = isPaidStatus(payload);

    return {
      isPaid,
      rawPayload: {
        mode: "live",
        ...payload,
      },
      failureReason: isPaid ? undefined : extractFailureReason(payload) ?? "Sham Cash reported an unsuccessful payment status.",
    };
  }
}
