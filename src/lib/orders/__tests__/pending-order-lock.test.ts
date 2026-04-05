import assert from "node:assert/strict";
import test from "node:test";
import { buildPendingOrderAdvisoryLockKeys } from "@/lib/orders/pending-order-lock";

test("buildPendingOrderAdvisoryLockKeys is deterministic for same user+offer", () => {
  const first = buildPendingOrderAdvisoryLockKeys({ userId: "u-1", offerId: "o-1" });
  const second = buildPendingOrderAdvisoryLockKeys({ userId: "u-1", offerId: "o-1" });
  assert.deepEqual(first, second);
});

test("buildPendingOrderAdvisoryLockKeys changes when user or offer changes", () => {
  const base = buildPendingOrderAdvisoryLockKeys({ userId: "u-1", offerId: "o-1" });
  const otherUser = buildPendingOrderAdvisoryLockKeys({ userId: "u-2", offerId: "o-1" });
  const otherOffer = buildPendingOrderAdvisoryLockKeys({ userId: "u-1", offerId: "o-2" });

  assert.notDeepEqual(base, otherUser);
  assert.notDeepEqual(base, otherOffer);
});

test("buildPendingOrderAdvisoryLockKeys returns signed int32 key parts", () => {
  const [key1, key2] = buildPendingOrderAdvisoryLockKeys({
    userId: "user-cly0000000000000000000001",
    offerId: "offer-cly0000000000000000000002",
  });

  assert.equal(Number.isInteger(key1), true);
  assert.equal(Number.isInteger(key2), true);
  assert.equal(key1 >= -2147483648 && key1 <= 2147483647, true);
  assert.equal(key2 >= -2147483648 && key2 <= 2147483647, true);
});
