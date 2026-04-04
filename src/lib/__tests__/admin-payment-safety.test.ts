import assert from "node:assert/strict";
import test from "node:test";
import {
  canRecoverPaymentAttempt,
  canReleaseTxLock,
  isAuditReasonValid,
  isPaymentOrderStateConsistent,
  shouldEnsureGrantForPaidState,
  shouldForceGrantAccess,
} from "@/lib/admin/payment-admin";

test("force grant is idempotent by checking active grant count", () => {
  assert.equal(shouldForceGrantAccess(0), true);
  assert.equal(shouldForceGrantAccess(1), false);
  assert.equal(shouldForceGrantAccess(2), false);
});

test("tx lock release allowed only from VERIFYING", () => {
  assert.equal(canReleaseTxLock("VERIFYING"), true);
  assert.equal(canReleaseTxLock("PAID"), false);
  assert.equal(canReleaseTxLock("FAILED"), false);
});

test("audit reason is mandatory and must be descriptive", () => {
  assert.equal(isAuditReasonValid(""), false);
  assert.equal(isAuditReasonValid("abc"), false);
  assert.equal(isAuditReasonValid("manual recovery for provider timeout"), true);
});

test("recover operation is limited to failed or stuck verification states", () => {
  assert.equal(canRecoverPaymentAttempt("FAILED"), true);
  assert.equal(canRecoverPaymentAttempt("VERIFYING"), true);
  assert.equal(canRecoverPaymentAttempt("SUBMITTED"), false);
  assert.equal(canRecoverPaymentAttempt("PAID"), false);
});

test("paid states trigger orphaned-grant prevention", () => {
  assert.equal(
    shouldEnsureGrantForPaidState({
      attemptStatus: "PAID",
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
    }),
    true,
  );
  assert.equal(
    shouldEnsureGrantForPaidState({
      attemptStatus: "FAILED",
      paymentStatus: "SUCCEEDED",
      orderStatus: "PENDING",
    }),
    true,
  );
  assert.equal(
    shouldEnsureGrantForPaidState({
      attemptStatus: "FAILED",
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
    }),
    false,
  );
});

test("payment/order consistency guard catches impossible state combos", () => {
  assert.equal(isPaymentOrderStateConsistent({ paymentStatus: "SUCCEEDED", orderStatus: "PAID" }), true);
  assert.equal(isPaymentOrderStateConsistent({ paymentStatus: "SUCCEEDED", orderStatus: "PENDING" }), false);
  assert.equal(isPaymentOrderStateConsistent({ paymentStatus: "FAILED", orderStatus: "PAID" }), false);
});
