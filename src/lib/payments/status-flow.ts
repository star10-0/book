import type { PaymentAttemptStatus } from "@prisma/client";

const PAYMENT_STATUS_TRANSITIONS: Record<PaymentAttemptStatus, readonly PaymentAttemptStatus[]> = {
  PENDING: ["SUBMITTED", "FAILED"],
  SUBMITTED: ["VERIFYING", "FAILED"],
  VERIFYING: ["PAID", "FAILED"],
  PAID: [],
  FAILED: [],
};

export function canTransitionPaymentStatus(from: PaymentAttemptStatus, to: PaymentAttemptStatus) {
  return PAYMENT_STATUS_TRANSITIONS[from].includes(to);
}

export function ensurePaymentStatusTransition(from: PaymentAttemptStatus, to: PaymentAttemptStatus) {
  if (!canTransitionPaymentStatus(from, to)) {
    throw new Error(`Invalid payment status transition: ${from} -> ${to}`);
  }
}

export const paymentAttemptStatusLabels: Record<PaymentAttemptStatus, string> = {
  PENDING: "قيد التجهيز",
  SUBMITTED: "تم الإرسال",
  VERIFYING: "قيد التحقق",
  PAID: "مدفوع",
  FAILED: "فشل الدفع",
};
