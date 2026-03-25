import { PaymentProvider } from "@prisma/client";
import { createMockPaymentResult, verifyMockPaymentResult } from "@/lib/payments/gateways/mock-payment-gateway";
import { GatewayConfigurationError } from "@/lib/payments/gateways/provider-http";
import { getSyriatelCashIntegrationConfig } from "@/lib/payments/gateways/provider-integration";
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
 * end-to-end before the real Syriatel Cash HTTP integration is added.
 */
export class SyriatelCashGateway implements PaymentGateway {
  readonly provider = PaymentProvider.SYRIATEL_CASH;

  async createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult> {
    const integration = getSyriatelCashIntegrationConfig();

    if (integration.mode === "live") {
      throw new GatewayConfigurationError("Syriatel Cash live integration is not implemented yet.");
    }

    return createMockPaymentResult("syriatel", input);
  }

  async verifyPayment(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult> {
    const integration = getSyriatelCashIntegrationConfig();

    if (integration.mode === "live") {
      throw new GatewayConfigurationError("Syriatel Cash live integration is not implemented yet.");
    }

    return verifyMockPaymentResult("Syriatel Cash", input);
  }
}
