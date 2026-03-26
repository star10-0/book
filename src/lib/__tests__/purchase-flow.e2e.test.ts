import assert from "node:assert/strict";
import test from "node:test";
import { AccessGrantStatus, AccessGrantType, ContentAccessPolicy, OfferType } from "@prisma/client";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { canAccessProtectedAsset } from "@/lib/files/protected-asset-policy";
import { calculateOrderTotals, mapOfferTypeToAccessGrantType, validateCreateOrderPayload } from "@/lib/orders/create-order";

type AccessGrantRecord = {
  id: string;
  userId: string;
  bookId: string;
  orderItemId: string;
  type: AccessGrantType;
  status: AccessGrantStatus;
  startsAt: Date;
  expiresAt: Date | null;
};

test("e2e purchase flow: sign-in to reader access grant", async () => {
  const user = {
    id: "user12345",
    email: "reader@example.com",
    passwordHash: await hashPassword("secret-123"),
  };

  const signedIn = await verifyPassword("secret-123", user.passwordHash);
  assert.equal(signedIn, true, "sign-in should verify user credentials");

  const orderPayload = validateCreateOrderPayload({
    bookId: "book12345",
    offerId: "offer12345",
  });
  assert.equal(orderPayload.ok, true, "order payload should be accepted");

  const totals = calculateOrderTotals({ subtotalCents: 1500, discountCents: 0 });
  assert.deepEqual(totals, { subtotalCents: 1500, discountCents: 0, totalCents: 1500 });
  assert.equal(mapOfferTypeToAccessGrantType(OfferType.PURCHASE), AccessGrantType.PURCHASE);

  const orderItems = [
    {
      id: "item-1",
      bookId: "book12345",
      offerType: OfferType.PURCHASE,
      rentalDays: null,
    },
  ];

  const grants: AccessGrantRecord[] = [];

  const tx = {
    orderItem: {
      async findMany() {
        return orderItems;
      },
    },
    accessGrant: {
      async findFirst(args: {
        where: {
          userId: string;
          bookId: string;
          type: AccessGrantType;
          status: AccessGrantStatus;
          OR?: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>;
        };
      }) {
        return (
          grants.find((grant) => {
            if (
              grant.userId !== args.where.userId ||
              grant.bookId !== args.where.bookId ||
              grant.type !== args.where.type ||
              grant.status !== args.where.status
            ) {
              return false;
            }

            if (!args.where.OR) {
              return true;
            }

            return args.where.OR.some((condition) => {
              if ("expiresAt" in condition && condition.expiresAt === null) {
                return grant.expiresAt === null;
              }

              if ("expiresAt" in condition && condition.expiresAt && "gt" in condition.expiresAt) {
                return grant.expiresAt !== null && grant.expiresAt > condition.expiresAt.gt;
              }

              return false;
            });
          }) ?? null
        );
      },
      async upsert(args: {
        where: { userId_orderItemId_type: { userId: string; orderItemId: string; type: AccessGrantType } };
        create: Omit<AccessGrantRecord, "id">;
      }) {
        const existing = grants.find(
          (grant) =>
            grant.userId === args.where.userId_orderItemId_type.userId &&
            grant.orderItemId === args.where.userId_orderItemId_type.orderItemId &&
            grant.type === args.where.userId_orderItemId_type.type,
        );

        if (!existing) {
          grants.push({
            id: `grant-${grants.length + 1}`,
            ...args.create,
          });
        }
      },
      async update() {
        return;
      },
    },
  };

  await grantAccessForPaidOrder(tx as never, {
    orderId: "order12345",
    userId: user.id,
    grantedAt: new Date("2026-03-26T00:00:00.000Z"),
  });

  assert.equal(grants.length, 1, "payment completion should issue one active grant");
  assert.equal(grants[0]?.status, AccessGrantStatus.ACTIVE);
  assert.equal(grants[0]?.type, AccessGrantType.PURCHASE);

  const readerAccess = canAccessProtectedAsset({
    policy: ContentAccessPolicy.PAID_ONLY,
    hasActiveGrant: true,
    requestedDisposition: "inline",
  });

  assert.deepEqual(readerAccess, {
    allowed: true,
    disposition: "inline",
  });
});
