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
 * Integrate real Syriatel Cash APIs here later.
 * Keep auth tokens, callback validation, and API mapping in this gateway implementation only.
 */
export class SyriatelCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SYRIATEL_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    return {
      providerReference: `syriatel-mock-${input.paymentId}`,
      rawPayload: {
        message: "Mock Syriatel Cash payment created.",
      },
    };
  }

  async verifyMock(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult> {
    if (input.mockOutcome === "failed") {
      return {
        isPaid: false,
        failureReason: "Mock Syriatel Cash verification failed.",
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
