import { PaymentProvider } from "@prisma/client";
import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  PaymentGateway,
  VerifyPaymentGatewayInput,
  VerifyPaymentGatewayResult,
} from "@/lib/payments/gateways/payment-gateway";
import {
  extractFailureReason,
  extractProviderReference,
  GatewayRequestError,
  isPaidStatus,
  postProviderJson,
  readOptionalTimeoutMs,
  readRequiredEnv,
} from "@/lib/payments/gateways/provider-http";

export class ShamCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SHAM_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    const payload = await postProviderJson({
      provider: this.provider,
      phase: "create",
      endpoint: buildShamCashEndpoint(readRequiredEnv("SHAM_CASH_CREATE_PAYMENT_PATH")),
      headers: {
        Authorization: `Bearer ${readRequiredEnv("SHAM_CASH_API_KEY")}`,
      },
      body: {
        merchantId: readRequiredEnv("SHAM_CASH_MERCHANT_ID"),
        paymentId: input.paymentId,
        orderId: input.orderId,
        customerId: input.customerId,
        amountCents: input.amountCents,
        currency: input.currency,
      },
      timeoutMs: readOptionalTimeoutMs("SHAM_CASH_TIMEOUT_MS"),
    });

    const providerReference = extractProviderReference(payload);

    if (!providerReference) {
      throw new GatewayRequestError({
        provider: this.provider,
        phase: "create",
        message: "Sham Cash create response did not include a provider reference.",
      });
    }

    const checkoutUrl = typeof payload.checkoutUrl === "string" ? payload.checkoutUrl : undefined;

    return {
      providerReference,
      checkoutUrl,
      rawPayload: payload,
    };
  }

  async verifyPayment(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult> {
    const payload = await postProviderJson({
      provider: this.provider,
      phase: "verify",
      endpoint: buildShamCashEndpoint(readRequiredEnv("SHAM_CASH_VERIFY_PAYMENT_PATH")),
      headers: {
        Authorization: `Bearer ${readRequiredEnv("SHAM_CASH_API_KEY")}`,
      },
      body: {
        merchantId: readRequiredEnv("SHAM_CASH_MERCHANT_ID"),
        paymentId: input.paymentId,
        providerReference: input.providerReference,
        transactionReference: input.transactionReference,
      },
      timeoutMs: readOptionalTimeoutMs("SHAM_CASH_TIMEOUT_MS"),
    });

    const isPaid = isPaidStatus(payload);

    return {
      isPaid,
      rawPayload: payload,
      failureReason: isPaid ? undefined : extractFailureReason(payload) ?? "Sham Cash verification returned unpaid status.",
    };
  }
}

function buildShamCashEndpoint(path: string): string {
  const baseUrl = readRequiredEnv("SHAM_CASH_API_BASE_URL");
  return new URL(path, ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}
