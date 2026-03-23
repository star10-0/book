import type { CreatePaymentGatewayInput, CreatePaymentGatewayResult, VerifyPaymentGatewayInput, VerifyPaymentGatewayResult } from "@/lib/payments/gateways/payment-gateway";

export function createMockPaymentResult(providerCode: string, input: CreatePaymentGatewayInput): CreatePaymentGatewayResult {
  const providerReference = `${providerCode}-${input.paymentId.slice(-8)}-${Date.now().toString(36)}`;

  return {
    providerReference,
    checkoutUrl: `/account/payments/${input.paymentId}`,
    rawPayload: {
      mode: "mock",
      providerReference,
      orderId: input.orderId,
      amountCents: input.amountCents,
      currency: input.currency,
    },
  };
}

export function verifyMockPaymentResult(providerName: string, input: VerifyPaymentGatewayInput): VerifyPaymentGatewayResult {
  const normalizedReference = input.transactionReference?.trim().toLowerCase() ?? "";
  const failedByReference = normalizedReference.includes("fail") || normalizedReference.includes("failed");
  const forcedOutcome = input.mockOutcome;

  const isPaid = forcedOutcome ? forcedOutcome === "paid" : !failedByReference;

  return {
    isPaid,
    rawPayload: {
      mode: "mock",
      providerReference: input.providerReference,
      transactionReference: input.transactionReference,
      status: isPaid ? "paid" : "failed",
    },
    failureReason: isPaid ? undefined : `${providerName} mock verification marked this payment as failed.`,
  };
}
