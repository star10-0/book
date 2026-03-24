import test from "node:test";
import assert from "node:assert/strict";
import { OrderStatus } from "@prisma/client";
import {
  canTransitionPaymentAttemptStatus,
  canTransitionPaymentStatus,
  deriveOrderStatusFromPaymentStatus,
  ensurePaymentStatusTransition,
} from "@/lib/payments/status-flow";

test("canTransitionPaymentAttemptStatus allows valid transitions", () => {
  assert.equal(canTransitionPaymentAttemptStatus("PENDING", "SUBMITTED"), true);
  assert.equal(canTransitionPaymentAttemptStatus("VERIFYING", "PAID"), true);
});

test("ensurePaymentStatusTransition throws for invalid attempt transitions", () => {
  assert.throws(() => ensurePaymentStatusTransition("PENDING", "PAID"), /Invalid payment status transition/);
  assert.throws(() => ensurePaymentStatusTransition("PAID", "FAILED"), /Invalid payment status transition/);
});

test("canTransitionPaymentStatus supports reconciliation-safe transitions", () => {
  assert.equal(canTransitionPaymentStatus("PENDING", "SUCCEEDED"), true);
  assert.equal(canTransitionPaymentStatus("FAILED", "SUCCEEDED"), true);
  assert.equal(canTransitionPaymentStatus("SUCCEEDED", "FAILED"), false);
  assert.equal(canTransitionPaymentStatus("REFUNDED", "SUCCEEDED"), false);
});

test("deriveOrderStatusFromPaymentStatus maps payment lifecycle to order lifecycle", () => {
  assert.equal(deriveOrderStatusFromPaymentStatus("SUCCEEDED"), OrderStatus.PAID);
  assert.equal(deriveOrderStatusFromPaymentStatus("FAILED"), OrderStatus.PENDING);
  assert.equal(deriveOrderStatusFromPaymentStatus("REFUNDED"), OrderStatus.REFUNDED);
});
