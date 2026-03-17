import { PaymentProvider } from "@prisma/client";
import type { PaymentGateway } from "@/lib/payments/gateways/payment-gateway";
import { ShamCashGateway } from "@/lib/payments/gateways/sham-cash-gateway";
import { SyriatelCashGateway } from "@/lib/payments/gateways/syriatel-cash-gateway";

const paymentGatewayRegistry: Record<PaymentProvider, PaymentGateway | null> = {
  MANUAL: null,
  STRIPE: null,
  SHAM_CASH: new ShamCashGateway(),
  SYRIATEL_CASH: new SyriatelCashGateway(),
};

export function resolvePaymentGateway(provider: PaymentProvider): PaymentGateway {
  const gateway = paymentGatewayRegistry[provider];

  if (!gateway) {
    throw new Error(`No payment gateway registered for provider: ${provider}`);
  }

  return gateway;
}
