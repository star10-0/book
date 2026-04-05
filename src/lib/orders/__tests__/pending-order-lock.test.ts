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
