import test from "node:test";
import assert from "node:assert/strict";
import { isOfferCurrentlyAvailable, validateCreateOrderPayload } from "@/lib/orders/create-order";

test("validateCreateOrderPayload trims valid ids", () => {
  const result = validateCreateOrderPayload({ bookId: " b1 ", offerId: " o1 " });

  assert.deepEqual(result, {
    data: {
      bookId: "b1",
      offerId: "o1",
    },
  });
});

test("validateCreateOrderPayload rejects missing fields", () => {
  assert.equal(validateCreateOrderPayload({ bookId: "", offerId: "o1" }).error, "حقل bookId مطلوب.");
  assert.equal(validateCreateOrderPayload({ bookId: "b1", offerId: "" }).error, "حقل offerId مطلوب.");
});

test("isOfferCurrentlyAvailable validates status, format and schedule", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  const available = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: new Date("2025-12-31T00:00:00.000Z"),
      endsAt: new Date("2026-01-02T00:00:00.000Z"),
      book: { status: "PUBLISHED", format: "DIGITAL" },
    },
    now,
  );

  const unavailableFuture = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: new Date("2026-01-02T00:00:00.000Z"),
      endsAt: null,
      book: { status: "PUBLISHED", format: "DIGITAL" },
    },
    now,
  );

  const unavailableBook = isOfferCurrentlyAvailable(
    {
      isActive: true,
      startsAt: null,
      endsAt: null,
      book: { status: "DRAFT", format: "DIGITAL" },
    },
    now,
  );

  assert.equal(available, true);
  assert.equal(unavailableFuture, false);
  assert.equal(unavailableBook, false);
});
