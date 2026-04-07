import assert from "node:assert/strict";
import test from "node:test";
import { loadOperationalReviewQueues, getQueueAlertSummary } from "@/lib/admin/review-queues";

test("queue inclusion rules include repeated suspicious users and actionable payment recoveries", async () => {
  const snapshot = await loadOperationalReviewQueues(new Date("2026-04-04T10:00:00.000Z"), {
    paymentAttemptsFindMany: async () => [
      {
        id: "attempt_failed_1",
        publicPaymentReference: "PAY-2026-0001",
        userId: "user_risky",
        status: "FAILED",
        failureReason: "gateway timeout",
        provider: "MANUAL",
        requestPayload: { transactionReference: "TX-1" },
        order: { id: "order_1", publicOrderNumber: "ORD-2026-0001" },
      },
      {
        id: "attempt_failed_2",
        publicPaymentReference: "PAY-2026-0002",
        userId: "user_risky",
        status: "FAILED",
        failureReason: "gateway timeout",
        provider: "MANUAL",
        requestPayload: { transactionReference: "TX-2" },
        order: { id: "order_2", publicOrderNumber: "ORD-2026-0002" },
      },
      {
        id: "attempt_failed_3",
        publicPaymentReference: "PAY-2026-0003",
        userId: "user_risky",
        status: "FAILED",
        failureReason: "gateway timeout",
        provider: "MANUAL",
        requestPayload: { transactionReference: "TX-3" },
        order: { id: "order_3", publicOrderNumber: "ORD-2026-0003" },
      },
    ],
    securityEventsFindMany: async () => [
      {
        id: "event_1",
        userId: "admin_1",
        type: "LOGIN_BLOCKED_UNTRUSTED_DEVICE",
        ipAddress: "10.0.0.1",
        metadata: null,
      },
      {
        id: "event_2",
        userId: "user_risky",
        type: "SUSPICIOUS_ACCOUNT_ACTIVITY",
        ipAddress: "10.0.0.2",
        metadata: { signal: "repeated_blocked_device_attempts" },
      },
    ],
    usersFindMany: async () => [
      {
        id: "admin_1",
        email: "admin@example.com",
        role: "ADMIN",
        requirePasswordReset: false,
        _count: { securityEvents: 3 },
      },
      {
        id: "user_risky",
        email: "risk@example.com",
        role: "USER",
        requirePasswordReset: false,
        _count: { securityEvents: 2 },
      },
    ],
    adminAuditCount: async () => 2,
    orderIntegritySnapshot: async () => ({
      totals: {
        paid_order_missing_grants: 1,
        grant_without_paid_flow: 0,
        promo_redemption_mismatch: 0,
        stale_rental_grant: 0,
        payment_order_grant_state_mismatch: 0,
      },
      anomalies: [
        {
          kind: "paid_order_missing_grants",
          orderId: "order_1",
          userId: "user_risky",
          details: "paid order has no active grants",
        },
      ],
      cursor: null,
    }),
  });

  assert.equal(snapshot.paymentRecoveryQueue.length, 3);
  assert.equal(snapshot.suspiciousUsersQueue.length, 2);
  assert.equal(snapshot.suspiciousDeviceAttemptsQueue.length, 1);
  assert.equal(snapshot.ordersRequiringInterventionQueue.length, 1);
  assert.equal(snapshot.risk.severity.critical >= 1, true);
  assert.equal(snapshot.paymentRecoveryQueue[0]?.recommendedAction.length > 0, true);
});

test("alert summary rolls up queue counts for dashboard", () => {
  const alerts = getQueueAlertSummary({
    paymentRecoveryQueue: [{ id: "a", label: "a", reason: "r", recommendedAction: "x" }],
    suspiciousUsersQueue: [{ id: "b", label: "b", reason: "r", recommendedAction: "x" }],
    suspiciousDeviceAttemptsQueue: [
      { id: "c", label: "c", reason: "r", recommendedAction: "x" },
      { id: "d", label: "d", reason: "r", recommendedAction: "x" },
    ],
    ordersRequiringInterventionQueue: [{ id: "e", label: "e", reason: "r", recommendedAction: "x" }],
    risk: {
      severity: { info: 0, warning: 1, critical: 2 },
      signals: [],
    },
  });

  assert.equal(alerts.criticalPaymentsNeedingReview, 1);
  assert.equal(alerts.suspiciousAccountsOrDevices, 3);
  assert.equal(alerts.integrityAnomalies, 1);
  assert.equal(alerts.criticalRiskSignals, 2);
});
