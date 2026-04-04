import assert from "node:assert/strict";
import test from "node:test";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { isEligibleForGrantRecovery, isPaidOrderMissingGrant, recoverMissingGrantsForPaidOrder } from "@/lib/admin/order-integrity";

test("paid but no grant detection returns true only for paid + no active grants", () => {
  assert.equal(isPaidOrderMissingGrant({ orderStatus: OrderStatus.PAID, hasItems: true, activeGrantCount: 0 }), true);
  assert.equal(isPaidOrderMissingGrant({ orderStatus: OrderStatus.PENDING, hasItems: true, activeGrantCount: 0 }), false);
  assert.equal(isPaidOrderMissingGrant({ orderStatus: OrderStatus.PAID, hasItems: true, activeGrantCount: 1 }), false);
});

test("grant recovery eligibility follows paid + succeeded payment (or free order)", () => {
  assert.equal(isEligibleForGrantRecovery({ orderStatus: OrderStatus.PAID, totalCents: 5000, succeededPayments: 1 }), true);
  assert.equal(isEligibleForGrantRecovery({ orderStatus: OrderStatus.PAID, totalCents: 0, succeededPayments: 0 }), true);
  assert.equal(isEligibleForGrantRecovery({ orderStatus: OrderStatus.PAID, totalCents: 5000, succeededPayments: 0 }), false);
  assert.equal(isEligibleForGrantRecovery({ orderStatus: OrderStatus.PENDING, totalCents: 5000, succeededPayments: 1 }), false);
});

test("recoverMissingGrantsForPaidOrder is idempotent and does not create duplicate grants on re-run", async () => {
  let grantCount = 0;

  const tx = {
    order: {
      findUnique: async () => ({
        id: "order_1",
        userId: "user_1",
        status: OrderStatus.PAID,
        totalCents: 5000,
        payments: [{ status: PaymentStatus.SUCCEEDED }],
        items: [{ id: "item_1" }],
      }),
    },
    accessGrant: {
      count: async () => grantCount,
    },
  };

  const deps = {
    transaction: async <T,>(run: (db: typeof tx) => Promise<T>) => run(tx),
    grantAccess: async () => {
      if (grantCount === 0) grantCount = 1;
    },
  };

  const firstRun = await recoverMissingGrantsForPaidOrder("order_1", deps as never);
  const secondRun = await recoverMissingGrantsForPaidOrder("order_1", deps as never);

  assert.equal(firstRun.ok, true);
  assert.equal(firstRun.recovered, 1);
  assert.equal(secondRun.ok, true);
  assert.equal(secondRun.recovered, 0);
});
