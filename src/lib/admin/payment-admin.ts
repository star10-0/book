export type AdminOperableAttemptStatus = "PENDING" | "SUBMITTED" | "VERIFYING" | "PAID" | "FAILED";
export type AdminOperablePaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type AdminOperableOrderStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type PaymentIncidentLabel =
  | "verification_failed"
  | "grant_missing"
  | "provider_mismatch"
  | "tx_conflict"
  | "recoverable_stuck_attempt";

export type BreakGlassOverrideValidationResult =
  | { allowed: true; normalizedReason: string; normalizedIncidentTicketId: string }
  | { allowed: false; code: "missing_reason" | "missing_incident_ticket" | "disabled_in_production" };

export function shouldForceGrantAccess(existingActiveGrantCount: number) {
  return existingActiveGrantCount === 0;
}

export function canReleaseTxLock(status: AdminOperableAttemptStatus) {
  return status === "VERIFYING";
}

export function isAuditReasonValid(reason: string) {
  return reason.trim().length >= 5;
}

export function isBreakGlassIncidentTicketValid(incidentTicketId: string) {
  return incidentTicketId.trim().length >= 3;
}

export function isBreakGlassPaymentOverrideEnabled() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const value = process.env.BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function validateBreakGlassForceGrantInput(input: { reason: string; incidentTicketId: string }): BreakGlassOverrideValidationResult {
  const normalizedReason = input.reason.trim();
  const normalizedIncidentTicketId = input.incidentTicketId.trim();

  if (!isBreakGlassPaymentOverrideEnabled()) {
    return { allowed: false, code: "disabled_in_production" };
  }

  if (!isAuditReasonValid(normalizedReason)) {
    return { allowed: false, code: "missing_reason" };
  }

  if (!isBreakGlassIncidentTicketValid(normalizedIncidentTicketId)) {
    return { allowed: false, code: "missing_incident_ticket" };
  }

  return {
    allowed: true,
    normalizedReason,
    normalizedIncidentTicketId,
  };
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

export function classifyPaymentIncident(input: {
  attemptStatus: AdminOperableAttemptStatus;
  paymentStatus: AdminOperablePaymentStatus;
  orderStatus: AdminOperableOrderStatus;
  hasAccessGrant: boolean;
  failureReason?: string | null;
  hasTransactionReference?: boolean;
  providerReferenceMatchesPayment?: boolean;
}): PaymentIncidentLabel | null {
  const reason = input.failureReason?.toLowerCase() ?? "";

  if (input.providerReferenceMatchesPayment === false) {
    return "provider_mismatch";
  }

  if (reason.includes("transaction") || reason.includes("tx") || reason.includes("duplicate")) {
    return "tx_conflict";
  }

  if (
    (input.attemptStatus === "PAID" || input.paymentStatus === "SUCCEEDED" || input.orderStatus === "PAID") &&
    !input.hasAccessGrant
  ) {
    return "grant_missing";
  }

  if (
    input.attemptStatus === "VERIFYING" ||
    (input.attemptStatus === "FAILED" && input.hasTransactionReference)
  ) {
    return "recoverable_stuck_attempt";
  }

  if (input.attemptStatus === "FAILED") {
    return "verification_failed";
  }

  return null;
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
