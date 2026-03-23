import type { PaymentProvider } from "@prisma/client";

export interface CreatePaymentGatewayInput {
  paymentId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  customerId: string;
}

export interface CreatePaymentGatewayResult {
  providerReference: string;
  checkoutUrl?: string;
  rawPayload?: Record<string, unknown>;
}

export interface VerifyPaymentGatewayInput {
  paymentId: string;
  providerReference: string;
  transactionReference?: string;
  mockOutcome?: "paid" | "failed";
}

export interface VerifyPaymentGatewayResult {
  isPaid: boolean;
  rawPayload?: Record<string, unknown>;
  failureReason?: string;
}

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createPayment(input: CreatePaymentGatewayInput): Promise<CreatePaymentGatewayResult>;
  verifyPayment(input: VerifyPaymentGatewayInput): Promise<VerifyPaymentGatewayResult>;
}
