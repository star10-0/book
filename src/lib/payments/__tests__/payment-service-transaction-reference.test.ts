import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentAttemptStatus } from "@prisma/client";
import { __paymentServiceInternals } from "@/lib/payments/payment-service";
import { canTransitionPaymentAttemptStatus } from "@/lib/payments/status-flow";

interface TxAttemptStub {
  id: string;
  userId: string;
  orderId: string;
  status: PaymentAttemptStatus;
}

function classify(current: TxAttemptStub, relatedAttempts: TxAttemptStub[]) {
  return __paymentServiceInternals.classifyTransactionReferenceUsage({
    currentAttempt: current,
    relatedAttempts,
  });
}

test("A) temporary failed verification can be recovered on same order via recoverable attempt reuse", () => {
  const decision = classify(
    { id: "attempt-new", userId: "user-1", orderId: "order-1", status: "SUBMITTED" },
    [{ id: "attempt-old-failed", userId: "user-1", orderId: "order-1", status: "FAILED" }],
  );

  assert.deepEqual(decision, {
    decision: "reuse_recoverable_attempt",
    recoverableAttemptId: "attempt-old-failed",
  });
});

test("B) tx used in failed attempt for same user/order is recoverable (not hard duplicate)", () => {
  const decision = classify(
    { id: "attempt-current", userId: "user-10", orderId: "order-10", status: "SUBMITTED" },
    [{ id: "attempt-failed", userId: "user-10", orderId: "order-10", status: "FAILED" }],
  );

  assert.equal(decision.decision, "reuse_recoverable_attempt");
});

test("C) tx used in paid attempt for different order must be rejected", () => {
  const decision = classify(
    { id: "attempt-current", userId: "user-1", orderId: "order-2", status: "SUBMITTED" },
    [{ id: "attempt-paid", userId: "user-99", orderId: "order-999", status: "PAID" }],
  );

  assert.equal(decision.decision, "reject_paid_elsewhere");
});

test("D) same-attempt resubmission remains idempotent by allowing unchanged reference", () => {
  const decision = classify({ id: "attempt-1", userId: "u1", orderId: "o1", status: "SUBMITTED" }, []);
  assert.equal(decision.decision, "allow");
});

test("E) tx currently verifying in another logical flow is rejected to avoid race", () => {
  const decision = classify(
    { id: "attempt-current", userId: "user-a", orderId: "order-a", status: "SUBMITTED" },
    [{ id: "attempt-verifying", userId: "user-b", orderId: "order-b", status: "VERIFYING" }],
  );

  assert.equal(decision.decision, "reject_currently_verifying");
});

test("F) failed attempt can transition back to VERIFYING for safe recovery and eventual granting", () => {
  assert.equal(canTransitionPaymentAttemptStatus("FAILED", "VERIFYING"), true);
});
