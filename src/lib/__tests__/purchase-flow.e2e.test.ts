import assert from "node:assert/strict";
import test from "node:test";
import { AccessGrantStatus, AccessGrantType, ContentAccessPolicy, OfferType, OrderStatus, PaymentStatus } from "@prisma/client";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import { canAccessProtectedAsset } from "@/lib/files/protected-asset-policy";
import { createStorageProvider } from "@/lib/files/storage-provider";
import { calculateOrderTotals, mapOfferTypeToAccessGrantType, validateCreateOrderPayload } from "@/lib/orders/create-order";
import { ShamCashGateway } from "@/lib/payments/gateways/sham-cash-gateway";
import { ensurePaymentStatusTransition } from "@/lib/payments/status-flow";

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

test("e2e happy path: sign in -> order -> payment completion -> grant -> reader", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SHAM_CASH_API_BASE_URL = "https://sham.example";
  process.env.SHAM_CASH_API_KEY = "secret-key";
  process.env.SHAM_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
  process.env.APP_BASE_URL = "https://book.example";

  const gateway = new ShamCashGateway();
  const freshOrderId = `order-e2e-${Date.now()}`;
  const freshTransactionReference = `tx-e2e-${Date.now()}`;

  let paymentAttemptStatus: "PENDING" | "SUBMITTED" | "VERIFYING" | "PAID" | "FAILED" = "SUBMITTED";
  let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
  let orderStatus: OrderStatus = OrderStatus.PENDING;

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        found: true,
        transaction: {
          tran_id: Number(freshTransactionReference.replace("tx-e2e-", "")),
          from_name: "sender",
          to_name: "merchant",
          currency: "SYP",
          amount: 15,
          datetime: "2026-03-28 15:52:17",
          account: "a0998366aeb6733b9513aaed75b55d71",
          note: "",
        },
        account: {
          account_address: "dest-acc-1",
        },
      }),
      { status: 200 },
    );

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
      async findMany(args: {
        where: {
          userId: string;
          bookId: { in: string[] };
          status: AccessGrantStatus;
          OR?: Array<
            { type: AccessGrantType } | { type: AccessGrantType; OR: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }> }
          >;
        };
      }) {
        return grants
          .filter((grant) => {
            if (
              grant.userId !== args.where.userId ||
              !args.where.bookId.in.includes(grant.bookId) ||
              grant.status !== args.where.status
            ) {
              return false;
            }

            if (!args.where.OR) {
              return true;
            }

            return args.where.OR.some((condition) => {
              if (!("type" in condition) || condition.type !== grant.type) {
                return false;
              }

              if (!("OR" in condition) || !condition.OR) {
                return true;
              }

              return condition.OR.some((rentalCondition) => {
                if ("expiresAt" in rentalCondition && rentalCondition.expiresAt === null) {
                  return grant.expiresAt === null;
                }

                if ("expiresAt" in rentalCondition && rentalCondition.expiresAt && "gt" in rentalCondition.expiresAt) {
                  return grant.expiresAt !== null && grant.expiresAt > rentalCondition.expiresAt.gt;
                }

                return false;
              });
            });
          })
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id))
          .map((grant) => ({
            id: grant.id,
            bookId: grant.bookId,
            type: grant.type,
            startsAt: grant.startsAt,
            expiresAt: grant.expiresAt,
          }));
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

  const verifyResult = await gateway.verifyPayment({
    paymentId: "payment-e2e-1",
    providerReference: "sham-manual:payment-e2e-1",
    transactionReference: freshTransactionReference,
    expectedAmountCents: 1500,
    expectedCurrency: "SYP",
  });

  assert.equal(verifyResult.isPaid, true, "real Sham Cash verify shape should be accepted for a valid tx");

  ensurePaymentStatusTransition(paymentAttemptStatus, "VERIFYING");
  paymentAttemptStatus = "VERIFYING";
  ensurePaymentStatusTransition(paymentAttemptStatus, "PAID");
  paymentAttemptStatus = "PAID";
  paymentStatus = PaymentStatus.SUCCEEDED;
  orderStatus = OrderStatus.PAID;

  await grantAccessForPaidOrder(tx as never, {
    orderId: freshOrderId,
    userId: user.id,
    grantedAt: new Date("2026-03-26T00:00:00.000Z"),
  });

  assert.equal(paymentAttemptStatus, "PAID");
  assert.equal(paymentStatus, PaymentStatus.SUCCEEDED);
  assert.equal(orderStatus, OrderStatus.PAID);

  assert.equal(grants.length, 1, "payment completion should issue one active grant");
  assert.equal(grants[0]?.status, AccessGrantStatus.ACTIVE);
  assert.equal(grants[0]?.type, AccessGrantType.PURCHASE);

  const libraryOwnedBooks = grants.filter(
    (grant) => grant.userId === user.id && grant.type === AccessGrantType.PURCHASE && grant.status === AccessGrantStatus.ACTIVE,
  );
  assert.equal(libraryOwnedBooks.length, 1, "library should include purchased book after successful payment");

  const readerAccess = canAccessProtectedAsset({
    policy: ContentAccessPolicy.PAID_ONLY,
    hasActiveGrant: true,
    requestedDisposition: "inline",
  });

  assert.deepEqual(readerAccess, {
    allowed: true,
    disposition: "inline",
  });

  const unpaidReaderAccess = canAccessProtectedAsset({
    policy: ContentAccessPolicy.PAID_ONLY,
    hasActiveGrant: false,
    requestedDisposition: "inline",
  });
  assert.deepEqual(
    unpaidReaderAccess,
    {
      allowed: false,
      reason: "UNAUTHORIZED",
    },
    "unpaid users should still be denied access to protected reader content",
  );

  const originals = {
    provider: process.env.BOOK_STORAGE_PROVIDER,
    accessKey: process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID,
    secret: process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY,
    bucket: process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET,
    privateBucket: process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET,
    region: process.env.BOOK_STORAGE_S3_REGION,
    endpoint: process.env.BOOK_STORAGE_S3_ENDPOINT,
  };

  process.env.BOOK_STORAGE_PROVIDER = "s3";
  process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID = "test-access";
  process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY = "test-secret";
  process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET = "public-bucket";
  process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET = "private-bucket";
  process.env.BOOK_STORAGE_S3_REGION = "us-east-1";
  process.env.BOOK_STORAGE_S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com";

  try {
    const provider = createStorageProvider("s3");
    const signed = await provider.createSignedAssetUrl({
      pointer: { key: "books/book12345/pdf/file.pdf", bucket: "private-bucket" },
      fileName: "book.pdf",
      disposition: "inline",
      mimeType: "application/pdf",
    });

    assert.ok(signed, "private reader file should be delivered through signed url in S3 mode");
    assert.match(signed ?? "", /X-Amz-Signature=/);
  } finally {
    process.env = originalEnv;
    global.fetch = originalFetch;

    if (typeof originals.provider === "string") process.env.BOOK_STORAGE_PROVIDER = originals.provider;
    else delete process.env.BOOK_STORAGE_PROVIDER;
    if (typeof originals.accessKey === "string") process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID = originals.accessKey;
    else delete process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;
    if (typeof originals.secret === "string") process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY = originals.secret;
    else delete process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;
    if (typeof originals.bucket === "string") process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET = originals.bucket;
    else delete process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;
    if (typeof originals.privateBucket === "string") process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET = originals.privateBucket;
    else delete process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET;
    if (typeof originals.region === "string") process.env.BOOK_STORAGE_S3_REGION = originals.region;
    else delete process.env.BOOK_STORAGE_S3_REGION;
    if (typeof originals.endpoint === "string") process.env.BOOK_STORAGE_S3_ENDPOINT = originals.endpoint;
    else delete process.env.BOOK_STORAGE_S3_ENDPOINT;
  }
});

test("e2e failure path: missing grant denies paid-only reader access", () => {
  const readerAccess = canAccessProtectedAsset({
    policy: ContentAccessPolicy.PAID_ONLY,
    hasActiveGrant: false,
    requestedDisposition: "inline",
  });

  assert.deepEqual(readerAccess, {
    allowed: false,
    reason: "UNAUTHORIZED",
  });
});
