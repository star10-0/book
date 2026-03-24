export const PAYMENT_ERROR_CODES = {
  orderNotFound: "ORDER_NOT_FOUND",
  orderNotPayable: "ORDER_NOT_PAYABLE",
  invalidOrderTotal: "INVALID_ORDER_TOTAL",
  invalidProviderReference: "INVALID_PROVIDER_REFERENCE",
  duplicateProviderReference: "DUPLICATE_PROVIDER_REFERENCE",
  invalidPaymentProofInput: "INVALID_PAYMENT_PROOF_INPUT",
  attemptNotFound: "ATTEMPT_NOT_FOUND",
  attemptNotSubmittable: "ATTEMPT_NOT_SUBMITTABLE",
  attemptAlreadyVerifying: "ATTEMPT_ALREADY_VERIFYING",
  mockVerificationDisabled: "MOCK_VERIFICATION_DISABLED",
  missingProviderReference: "MISSING_PROVIDER_REFERENCE",
  providerReferenceIntegrityMismatch: "PROVIDER_REFERENCE_INTEGRITY_MISMATCH",
} as const;

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES];

export function paymentError(code: PaymentErrorCode): never {
  throw new Error(code);
}

export function isPaymentError(error: unknown, code: PaymentErrorCode) {
  return error instanceof Error && error.message === code;
}
