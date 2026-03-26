import { strict as assert } from "node:assert";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { buildBookOffersReplaceData, canManageCreatorBook, parseTextContentForm } from "@/lib/services/book-workflows";

test("parseTextContentForm enforces max length", () => {
  const valid = new FormData();
  valid.set("textContent", "  أهلاً بالعالم  ");

  const parsedValid = parseTextContentForm(valid);
  assert.equal(parsedValid.error, undefined);
  assert.equal(parsedValid.textContent, "أهلاً بالعالم");

  const tooLong = new FormData();
  tooLong.set("textContent", "x".repeat(500_001));
  const parsedLong = parseTextContentForm(tooLong);

  assert.equal(parsedLong.error, "المحتوى النصي طويل جدًا. الحد الأقصى 500,000 حرف.");
});

test("buildBookOffersReplaceData replaces purchase and rental offers only", () => {
  const writes = buildBookOffersReplaceData({
    status: "DRAFT",
    buyEnabled: true,
    rentEnabled: true,
    purchasePriceCents: 1000,
    rentalPriceCents: 250,
    rentalDays: 7,
    contentAccessPolicy: "PAID_ONLY",
    metadata: Prisma.JsonNull,
  });

  assert.deepEqual(writes.deleteMany, { type: { in: ["PURCHASE", "RENTAL"] } });
  assert.equal(writes.create.length, 2);
});

test("canManageCreatorBook allows owners and admins", () => {
  assert.equal(canManageCreatorBook({ userRole: "ADMIN", userId: "u1", creatorId: "u2" }), true);
  assert.equal(canManageCreatorBook({ userRole: "CREATOR", userId: "u1", creatorId: "u1" }), true);
  assert.equal(canManageCreatorBook({ userRole: "CREATOR", userId: "u1", creatorId: "u2" }), false);
  assert.equal(canManageCreatorBook({ userRole: "CREATOR", userId: "u1", creatorId: null }), false);
});
