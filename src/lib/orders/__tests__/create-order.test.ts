import test from "node:test";
import assert from "node:assert/strict";
import { isOfferCurrentlyAvailable, validateCreateOrderPayload } from "@/lib/orders/create-order";

test("validateCreateOrderPayload trims valid ids", () => {
  const result = validateCreateOrderPayload({ bookId: " cly0000000000000000000001 ", offerId: " cly0000000000000000000002 " });

  assert.deepEqual(result, {
    data: {
      bookId: "cly0000000000000000000001",
      offerId: "cly0000000000000000000002",
    },
  });
});

test("validateCreateOrderPayload rejects missing and malformed fields", () => {
  assert.equal(validateCreateOrderPayload({ bookId: "", offerId: "cly0000000000000000000002" }).error, "حقل bookId مطلوب.");
  assert.equal(validateCreateOrderPayload({ bookId: "cly0000000000000000000001", offerId: "" }).error, "حقل offerId مطلوب.");
  assert.equal(
    validateCreateOrderPayload({ bookId: "not-valid-id", offerId: "cly0000000000000000000002" }).error,
    "معرّفات الطلب غير صالحة.",
  );
});

test("isOfferCurrentlyAvailable validates status, format, rental settings and schedule", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  const available = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: new Date("2025-12-31T00:00:00.000Z"),
      endsAt: new Date("2026-01-02T00:00:00.000Z"),
      type: "RENTAL",
      rentalDays: 7,
      book: { status: "PUBLISHED", format: "DIGITAL" },
    },
    now,
  );

  const unavailableFuture = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: new Date("2026-01-02T00:00:00.000Z"),
      endsAt: null,
      type: "PURCHASE",
      rentalDays: null,
      book: { status: "PUBLISHED", format: "DIGITAL" },
    },
    now,
  );

  const unavailableBook = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: null,
      endsAt: null,
      type: "PURCHASE",
      rentalDays: null,
      book: { status: "DRAFT", format: "DIGITAL" },
    },
    now,
  );

  const invalidRental = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: null,
      endsAt: null,
      type: "RENTAL",
      rentalDays: null,
      book: { status: "PUBLISHED", format: "DIGITAL" },
    },
    now,
  );

  assert.equal(available, true);
  assert.equal(unavailableFuture, false);
  assert.equal(unavailableBook, false);
  assert.equal(invalidRental, false);
});
