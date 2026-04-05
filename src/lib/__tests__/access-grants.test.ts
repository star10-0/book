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
  let accessGrantFindManyCalls = 0;

  return {
    created,
    getAccessGrantFindManyCalls: () => accessGrantFindManyCalls,
    tx: {
      orderItem: {
        findMany: async () => orderItems,
      },
      accessGrant: {
        findMany: async ({ where }: { where: Record<string, unknown> }) => {
          accessGrantFindManyCalls += 1;
          const bookIdFilter = where.bookId as { in: string[] } | undefined;
          const matches = created.filter((grant) => {
            if (where.userId && grant.userId !== where.userId) {
              return false;
            }

            if (bookIdFilter && !bookIdFilter.in.includes(grant.bookId)) {
              return false;
            }

            if (where.status && grant.status !== where.status) {
              return false;
            }

            const or = where.OR as
              | Array<{ type: AccessGrantType } | { type: AccessGrantType; OR: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }> }>
              | undefined;

            if (or && or.length > 0) {
              const anyMatches = or.some((condition) => {
                if (!("type" in condition) || condition.type !== grant.type) {
                  return false;
                }

                if (!("OR" in condition) || !condition.OR) {
                  return true;
                }

                return condition.OR.some((rentalCondition) => {
                  if (rentalCondition.expiresAt === null) {
                    return grant.expiresAt == null;
                  }

                  if (rentalCondition.expiresAt.gt) {
                    return !!grant.expiresAt && grant.expiresAt > rentalCondition.expiresAt.gt;
                  }

                  return false;
                });
              });

              if (!anyMatches) {
                return false;
              }
            }

            return true;
          });

          return matches
            .slice()
            .sort((a, b) => {
              const aStarts = a.startsAt?.getTime() ?? 0;
              const bStarts = b.startsAt?.getTime() ?? 0;
              if (aStarts !== bStarts) {
                return aStarts - bStarts;
              }
              return a.id.localeCompare(b.id);
            })
            .map((grant) => ({
              id: grant.id,
              bookId: grant.bookId,
              type: grant.type,
              startsAt: grant.startsAt ?? new Date(0),
              expiresAt: grant.expiresAt ?? null,
            }));
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
  const { created, tx, getAccessGrantFindManyCalls } = createTxStub([
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
  assert.equal(getAccessGrantFindManyCalls(), 1);
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

test("grantAccessForPaidOrder creates a new rental when existing rental is expired", async () => {
  const baseDate = new Date("2026-01-10T10:00:00.000Z");
  const { created, tx } = createTxStub([{ id: "i-r-new", bookId: "b-3", offerType: OfferType.RENTAL, rentalDays: 5 }]);

  created.push({
    id: "g-old-rental",
    userId: "u-1",
    bookId: "b-3",
    type: AccessGrantType.RENTAL,
    status: AccessGrantStatus.ACTIVE,
    orderItemId: "old-item",
    startsAt: new Date("2026-01-01T10:00:00.000Z"),
    expiresAt: new Date("2026-01-05T10:00:00.000Z"),
  });

  await grantAccessForPaidOrder(tx as never, {
    orderId: "o-4",
    userId: "u-1",
    grantedAt: baseDate,
  });

  assert.equal(created.length, 2);
  const newest = created.find((grant) => grant.orderItemId === "i-r-new");
  assert.equal(newest?.expiresAt?.toISOString(), new Date("2026-01-15T10:00:00.000Z").toISOString());
});
