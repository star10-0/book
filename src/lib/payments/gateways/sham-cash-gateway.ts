import { PaymentProvider } from "@prisma/client";
import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  PaymentGateway,
  VerifyPaymentGatewayInput,
  VerifyPaymentGatewayResult,
} from "@/lib/payments/gateways/payment-gateway";

/**
 * Developer note:
 * Integrate real Sham Cash APIs here later.
 * Keep request signing, credentials, and webhook verification isolated inside this gateway.
 */
export class ShamCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SHAM_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    return {
      providerReference: `sham-mock-${input.paymentId}`,
      rawPayload: {
        message: "Mock Sham Cash payment created.",
      },
    };
  }

  async verifyMock(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult> {
    if (input.mockOutcome === "failed") {
      return {
        isPaid: false,
        failureReason: "Mock Sham Cash verification failed.",
        rawPayload: {
          providerReference: input.providerReference,
          status: "failed",
        },
      };
    }

    return {
      isPaid: true,
      rawPayload: {
        providerReference: input.providerReference,
        status: "paid",
      },
    };
  }
}
