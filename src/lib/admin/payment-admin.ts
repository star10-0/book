export type AdminOperableAttemptStatus = "PENDING" | "SUBMITTED" | "VERIFYING" | "PAID" | "FAILED";
export type AdminOperablePaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type AdminOperableOrderStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";

export function shouldForceGrantAccess(existingActiveGrantCount: number) {
  return existingActiveGrantCount === 0;
}

export function canReleaseTxLock(status: AdminOperableAttemptStatus) {
  return status === "VERIFYING";
}

export function isAuditReasonValid(reason: string) {
  return reason.trim().length >= 5;
}

export function canRecoverPaymentAttempt(status: AdminOperableAttemptStatus) {
  return status === "FAILED" || status === "VERIFYING";
}

export function shouldEnsureGrantForPaidState(input: {
  attemptStatus: AdminOperableAttemptStatus;
  paymentStatus: AdminOperablePaymentStatus;
  orderStatus: AdminOperableOrderStatus;
}) {
  return input.attemptStatus === "PAID" || input.paymentStatus === "SUCCEEDED" || input.orderStatus === "PAID";
}

export function isPaymentOrderStateConsistent(input: {
  paymentStatus: AdminOperablePaymentStatus;
  orderStatus: AdminOperableOrderStatus;
}) {
  if (input.paymentStatus === "SUCCEEDED") {
    return input.orderStatus === "PAID";
  }

  if (input.paymentStatus === "PENDING") {
    return input.orderStatus === "PENDING";
  }

  if (input.paymentStatus === "FAILED") {
    return input.orderStatus === "PENDING" || input.orderStatus === "CANCELLED";
  }

  if (input.paymentStatus === "REFUNDED") {
    return input.orderStatus === "REFUNDED" || input.orderStatus === "CANCELLED";
  }

  return true;
}
