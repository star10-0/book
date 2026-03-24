import { OrderStatus, PaymentStatus, type PaymentAttemptStatus } from "@prisma/client";

const PAYMENT_ATTEMPT_TRANSITIONS: Record<PaymentAttemptStatus, readonly PaymentAttemptStatus[]> = {
  PENDING: ["SUBMITTED", "FAILED"],
  SUBMITTED: ["VERIFYING", "FAILED"],
  VERIFYING: ["PAID", "FAILED"],
  PAID: [],
  FAILED: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["SUCCEEDED", "FAILED", "REFUNDED"],
  SUCCEEDED: ["REFUNDED"],
  FAILED: ["SUCCEEDED"],
  REFUNDED: [],
};

export function canTransitionPaymentAttemptStatus(from: PaymentAttemptStatus, to: PaymentAttemptStatus) {
  return PAYMENT_ATTEMPT_TRANSITIONS[from].includes(to);
}

export function ensurePaymentStatusTransition(from: PaymentAttemptStatus, to: PaymentAttemptStatus) {
  if (!canTransitionPaymentAttemptStatus(from, to)) {
    throw new Error(`Invalid payment status transition: ${from} -> ${to}`);
  }
}

export function canTransitionPaymentStatus(from: PaymentStatus, to: PaymentStatus) {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function deriveOrderStatusFromPaymentStatus(status: PaymentStatus): OrderStatus {
  if (status === "SUCCEEDED") {
    return OrderStatus.PAID;
  }

  if (status === "REFUNDED") {
    return OrderStatus.REFUNDED;
  }

  return OrderStatus.PENDING;
}

export const paymentAttemptStatusLabels: Record<PaymentAttemptStatus, string> = {
  PENDING: "قيد التجهيز",
  SUBMITTED: "تم الإرسال",
  VERIFYING: "قيد التحقق",
  PAID: "مدفوع",
  FAILED: "فشل الدفع",
};
