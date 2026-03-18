import test from "node:test";
import assert from "node:assert/strict";
import { AccessGrantStatus, AccessGrantType, OfferType } from "@prisma/client";
import { grantAccessForPaidOrder } from "@/lib/access-grants";

function createTxStub(orderItems: Array<{ id: string; bookId: string; offerType: OfferType; rentalDays: number | null }>) {
  const created: Array<Record<string, unknown>> = [];

  return {
    created,
    tx: {
      orderItem: {
        findMany: async () => orderItems,
      },
      accessGrant: {
        findFirst: async ({ where }: { where: { orderItemId?: string; bookId?: string; type: AccessGrantType } }) => {
          if (where.orderItemId) {
            const match = created.find(
              (grant) => grant.orderItemId === where.orderItemId && grant.type === where.type,
            );
            return match ? { id: String(match.id) } : null;
          }

          if (where.bookId) {
            const match = created.find(
              (grant) =>
                grant.bookId === where.bookId &&
                grant.type === AccessGrantType.PURCHASE &&
                grant.status === AccessGrantStatus.ACTIVE,
            );

            return match ? { id: String(match.id) } : null;
          }

          return null;
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ id: `g-${created.length + 1}`, ...data });
          return data;
        },
      },
    },
  };
}

test("grantAccessForPaidOrder creates grants for purchase and rental items", async () => {
  const baseDate = new Date("2026-01-01T10:00:00.000Z");
  const { created, tx } = createTxStub([
    { id: "i-p", bookId: "b-1", offerType: OfferType.PURCHASE, rentalDays: null },
    { id: "i-r", bookId: "b-2", offerType: OfferType.RENTAL, rentalDays: 7 },
  ]);

  await grantAccessForPaidOrder(tx as never, {
    orderId: "o-1",
    userId: "u-1",
    grantedAt: baseDate,
  });

  assert.equal(created.length, 2);
  assert.equal(created[0].type, AccessGrantType.PURCHASE);
  assert.equal(created[0].expiresAt, undefined);
  assert.equal(created[1].type, AccessGrantType.RENTAL);
  assert.equal((created[1].expiresAt as Date).toISOString(), new Date("2026-01-08T10:00:00.000Z").toISOString());
});

test("grantAccessForPaidOrder rejects invalid rental duration", async () => {
  const { tx } = createTxStub([{ id: "i-r", bookId: "b-2", offerType: OfferType.RENTAL, rentalDays: 0 }]);

  await assert.rejects(
    grantAccessForPaidOrder(tx as never, {
      orderId: "o-1",
      userId: "u-1",
      grantedAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    /INVALID_RENTAL_DAYS/,
  );
});
