import assert from "node:assert/strict";
import test from "node:test";
import {
  isBreakGlassIncidentTicketValid,
  isBreakGlassPaymentOverrideEnabled,
  canRecoverPaymentAttempt,
  canReleaseTxLock,
  classifyPaymentIncident,
  isAuditReasonValid,
  isPaymentOrderStateConsistent,
  shouldEnsureGrantForPaidState,
  shouldForceGrantAccess,
  validateBreakGlassForceGrantInput,
} from "@/lib/admin/payment-admin";
import { buildImmutableAuditMetadata } from "@/lib/admin/audit-log";

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

test("incident classification labels grant missing and tx conflicts", () => {
  assert.equal(
    classifyPaymentIncident({
      attemptStatus: "PAID",
      paymentStatus: "SUCCEEDED",
      orderStatus: "PAID",
      hasAccessGrant: false,
      hasTransactionReference: true,
      providerReferenceMatchesPayment: true,
      failureReason: null,
    }),
    "grant_missing",
  );

  assert.equal(
    classifyPaymentIncident({
      attemptStatus: "FAILED",
      paymentStatus: "FAILED",
      orderStatus: "PENDING",
      hasAccessGrant: false,
      hasTransactionReference: true,
      providerReferenceMatchesPayment: true,
      failureReason: "duplicate tx already used",
    }),
    "tx_conflict",
  );
});

test("existing access grant prevents duplicate forced grant", () => {
  assert.equal(shouldForceGrantAccess(1), false);
  assert.equal(shouldForceGrantAccess(5), false);
});

test("break-glass incident ticket must be non-empty and structured", () => {
  assert.equal(isBreakGlassIncidentTicketValid(""), false);
  assert.equal(isBreakGlassIncidentTicketValid("  "), false);
  assert.equal(isBreakGlassIncidentTicketValid("A1"), false);
  assert.equal(isBreakGlassIncidentTicketValid("INC-1024"), true);
});

test("break-glass force grant validation denies missing incident id", () => {
  const result = validateBreakGlassForceGrantInput({
    reason: "emergency recovery after provider outage",
    incidentTicketId: " ",
  });

  assert.deepEqual(result, { allowed: false, code: "missing_incident_ticket" });
});

test("break-glass force grant validation allows explicit incident + reason", () => {
  const result = validateBreakGlassForceGrantInput({
    reason: " emergency recovery after provider outage ",
    incidentTicketId: " INC-778 ",
  });

  assert.equal(result.allowed, true);
  if (result.allowed) {
    assert.equal(result.normalizedReason, "emergency recovery after provider outage");
    assert.equal(result.normalizedIncidentTicketId, "INC-778");
  }
});

test("audit metadata builder freezes nested metadata to keep immutable trail shape", () => {
  const metadata = buildImmutableAuditMetadata({
    mode: "break_glass",
    beforeState: { paymentStatus: "PENDING" },
    afterState: { paymentStatus: "SUCCEEDED" },
  });

  assert.equal(Object.isFrozen(metadata), true);
  assert.equal(Object.isFrozen((metadata as { beforeState: object }).beforeState), true);
  assert.equal(Object.isFrozen((metadata as { afterState: object }).afterState), true);
});

test("break-glass env gate defaults enabled outside production", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const originalNodeEnv = mutableEnv.NODE_ENV;
  const originalGate = mutableEnv.BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED;

  try {
    mutableEnv.NODE_ENV = "test";
    delete mutableEnv.BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED;
    assert.equal(isBreakGlassPaymentOverrideEnabled(), true);
  } finally {
    mutableEnv.NODE_ENV = originalNodeEnv;
    if (originalGate === undefined) {
      delete mutableEnv.BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED;
    } else {
      mutableEnv.BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED = originalGate;
    }
  }
});
