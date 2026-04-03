import assert from "node:assert/strict";
import test from "node:test";
import { canReleaseTxLock, shouldForceGrantAccess } from "@/lib/admin/payment-admin";

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
