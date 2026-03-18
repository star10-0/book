import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionPaymentStatus, ensurePaymentStatusTransition } from "@/lib/payments/status-flow";

test("canTransitionPaymentStatus allows valid transitions", () => {
  assert.equal(canTransitionPaymentStatus("PENDING", "SUBMITTED"), true);
  assert.equal(canTransitionPaymentStatus("VERIFYING", "PAID"), true);
});

test("ensurePaymentStatusTransition throws for invalid transitions", () => {
  assert.throws(() => ensurePaymentStatusTransition("PENDING", "PAID"), /Invalid payment status transition/);
  assert.throws(() => ensurePaymentStatusTransition("PAID", "FAILED"), /Invalid payment status transition/);
});
