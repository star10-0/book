import test from "node:test";
import assert from "node:assert/strict";
import { AccessGrantStatus, AccessGrantType, OfferType } from "@prisma/client";
import { grantAccessForPaidOrder } from "@/lib/access-grants";

type GrantRecord = {
  id: string;
  userId: string;
  bookId: string;
  orderItemId?: string;
  type: AccessGrantType;
  status: AccessGrantStatus;
  startsAt?: Date;
  expiresAt?: Date | null;
};

function createTxStub(orderItems: Array<{ id: string; bookId: string; offerType: OfferType; rentalDays: number | null }>) {
  const created: GrantRecord[] = [];

  return {
    created,
    tx: {
      orderItem: {
        findMany: async () => orderItems,
      },
      accessGrant: {
        findFirst: async ({ where }: { where: Record<string, unknown> }) => {
          const matches = created.filter((grant) => {
            if (where.userId && grant.userId !== where.userId) {
              return false;
            }

            if (where.bookId && grant.bookId !== where.bookId) {
              return false;
            }

            if (where.orderItemId && grant.orderItemId !== where.orderItemId) {
              return false;
            }

            if (where.type && grant.type !== where.type) {
              return false;
            }

            if (where.status && grant.status !== where.status) {
              return false;
            }

            const or = where.OR as Array<{ expiresAt?: { gt?: Date } | null }> | undefined;

            if (or && or.length > 0) {
              const anyMatches = or.some((condition) => {
                if (condition.expiresAt === null) {
                  return grant.expiresAt == null;
                }

                if (condition.expiresAt && condition.expiresAt.gt) {
                  return !!grant.expiresAt && grant.expiresAt > condition.expiresAt.gt;
                }

                return false;
              });

              if (!anyMatches) {
                return false;
              }
            }

            return true;
          });

          return matches[0] ? { id: matches[0].id, expiresAt: matches[0].expiresAt ?? null } : null;
        },
        create: async ({ data }: { data: Omit<GrantRecord, "id"> }) => {
          const saved: GrantRecord = {
            id: `g-${created.length + 1}`,
            ...data,
          };
          created.push(saved);
          return saved;
        },
        upsert: async ({
          where,
          create,
        }: {
          where: { userId_orderItemId_type: { userId: string; orderItemId: string; type: AccessGrantType } };
          update: Record<string, unknown>;
          create: Omit<GrantRecord, "id">;
        }) => {
          const existing = created.find(
            (grant) =>
              grant.userId === where.userId_orderItemId_type.userId &&
              grant.orderItemId === where.userId_orderItemId_type.orderItemId &&
              grant.type === where.userId_orderItemId_type.type,
          );

          if (existing) {
            return existing;
          }

          const saved: GrantRecord = {
            id: `g-${created.length + 1}`,
            ...create,
          };
          created.push(saved);
          return saved;
        },
        update: async ({ where, data }: { where: { id: string }; data: { expiresAt?: Date } }) => {
          const target = created.find((grant) => grant.id === where.id);

          if (!target) {
            throw new Error("GRANT_NOT_FOUND");
          }

          if (data.expiresAt) {
            target.expiresAt = data.expiresAt;
          }

          return target;
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
  assert.equal(created[1].expiresAt?.toISOString(), new Date("2026-01-08T10:00:00.000Z").toISOString());
});

test("grantAccessForPaidOrder extends existing active rentals instead of creating duplicates", async () => {
  const baseDate = new Date("2026-01-01T10:00:00.000Z");
  const { created, tx } = createTxStub([{ id: "i-r", bookId: "b-2", offerType: OfferType.RENTAL, rentalDays: 7 }]);

  created.push({
    id: "g-existing",
    userId: "u-1",
    bookId: "b-2",
    type: AccessGrantType.RENTAL,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2025-12-25T10:00:00.000Z"),
    expiresAt: new Date("2026-01-04T10:00:00.000Z"),
  });

  await grantAccessForPaidOrder(tx as never, {
    orderId: "o-2",
    userId: "u-1",
    grantedAt: baseDate,
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].expiresAt?.toISOString(), new Date("2026-01-11T10:00:00.000Z").toISOString());
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

test("grantAccessForPaidOrder skips duplicate active purchase for same book", async () => {
  const baseDate = new Date("2026-01-01T10:00:00.000Z");
  const { created, tx } = createTxStub([{ id: "i-p", bookId: "b-1", offerType: OfferType.PURCHASE, rentalDays: null }]);

  created.push({
    id: "g-purchase",
    userId: "u-1",
    bookId: "b-1",
    type: AccessGrantType.PURCHASE,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2025-12-20T10:00:00.000Z"),
  });

  await grantAccessForPaidOrder(tx as never, {
    orderId: "o-3",
    userId: "u-1",
    grantedAt: baseDate,
  });

  assert.equal(created.length, 1);
  assert.equal(created[0].id, "g-purchase");
});
