import assert from "node:assert/strict";
import test from "node:test";
import { buildRiskSignals, summarizeRiskSeverity } from "@/lib/admin/risk-engine";

test("buildRiskSignals creates expected risk entries from rule flags", () => {
  const now = new Date("2026-04-04T12:00:00.000Z");
  const signals = buildRiskSignals(
    {
      newDeviceAttemptsOnProtectedAccounts: 1,
      repeatedBlockedDeviceLogins: 1,
      suspiciousMultiDevicePatterns: 0,
      repeatedPaymentVerificationFailures: 2,
      txConflictsOrAbnormalManualPaymentBehavior: 1,
    },
    now,
  );

  assert.equal(signals.length, 4);
  assert.equal(signals.some((signal) => signal.code === "NEW_DEVICE_PROTECTED_ACCOUNT"), true);
  assert.equal(signals.some((signal) => signal.code === "REPEATED_BLOCKED_DEVICE_LOGINS"), true);
  assert.equal(signals.some((signal) => signal.code === "REPEATED_PAYMENT_VERIFICATION_FAILURES"), true);
  assert.equal(signals.some((signal) => signal.code === "TX_CONFLICT_OR_ABNORMAL_MANUAL_PAYMENT"), true);
  assert.equal(signals.every((signal) => signal.occurredAt.getTime() === now.getTime()), true);
});

test("summarizeRiskSeverity reports warning and critical distribution", () => {
  const signals = buildRiskSignals({
    newDeviceAttemptsOnProtectedAccounts: 1,
    repeatedBlockedDeviceLogins: 1,
    suspiciousMultiDevicePatterns: 1,
    repeatedPaymentVerificationFailures: 1,
    txConflictsOrAbnormalManualPaymentBehavior: 0,
  });

  const summary = summarizeRiskSeverity(signals);
  assert.equal(summary.info, 0);
  assert.equal(summary.warning, 3);
  assert.equal(summary.critical, 1);
});
