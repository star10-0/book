import assert from "node:assert/strict";
import test from "node:test";
import { isPaidStatus } from "@/lib/payments/gateways/provider-http";

test("isPaidStatus treats found=true as paid for find_tx style payloads", () => {
  assert.equal(isPaidStatus({ found: true }), true);
});

test("isPaidStatus matches conventional success statuses", () => {
  assert.equal(isPaidStatus({ status: "PAID" }), true);
  assert.equal(isPaidStatus({ paymentStatus: "succeeded" }), true);
  assert.equal(isPaidStatus({ transactionStatus: "completed" }), true);
});

test("isPaidStatus rejects unknown status", () => {
  assert.equal(isPaidStatus({ status: "pending" }), false);
});
