import { PaymentProvider } from "@prisma/client";
import { createMockPaymentResult, verifyMockPaymentResult } from "@/lib/payments/gateways/mock-payment-gateway";
import type {
  CreatePaymentGatewayInput,
  CreatePaymentGatewayResult,
  PaymentGateway,
  VerifyPaymentGatewayInput,
  VerifyPaymentGatewayResult,
} from "@/lib/payments/gateways/payment-gateway";

/**
 * Placeholder implementation.
 *
 * This gateway intentionally runs in mock mode so the app flow can be validated
 * end-to-end before the real Sham Cash HTTP integration is added.
 */
export class ShamCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SHAM_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    return createMockPaymentResult("sham", input);
  }

  async verifyPayment(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult> {
    return verifyMockPaymentResult("Sham Cash", input);
  }
}
