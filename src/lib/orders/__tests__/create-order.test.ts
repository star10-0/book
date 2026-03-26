import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderTotals, isOfferCurrentlyAvailable, validateCreateOrderPayload } from "@/lib/orders/create-order";

test("validateCreateOrderPayload trims valid ids", () => {
  const result = validateCreateOrderPayload({ bookId: " cly0000000000000000000001 ", offerId: " cly0000000000000000000002 " });

  assert.deepEqual(result, {
    ok: true,
    data: {
      bookId: "cly0000000000000000000001",
      offerId: "cly0000000000000000000002",
    },
  });
});

test("validateCreateOrderPayload rejects missing and malformed fields", () => {
  const missingBookId = validateCreateOrderPayload({ bookId: "", offerId: "cly0000000000000000000002" });
  const missingOfferId = validateCreateOrderPayload({ bookId: "cly0000000000000000000001", offerId: "" });
  const malformed = validateCreateOrderPayload({ bookId: "not-valid-id", offerId: "cly0000000000000000000002" });

  assert.equal(missingBookId.ok, false);
  assert.equal(missingOfferId.ok, false);
  assert.equal(malformed.ok, false);

  if (!missingOfferId.ok) {
    assert.equal(missingOfferId.error, "حقل offerId مطلوب.");
  }

  if (!malformed.ok) {
    assert.equal(malformed.error, "معرّفات الطلب غير صالحة.");
  }
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

test("calculateOrderTotals computes discounted and zero-cost totals safely", () => {
  const discounted = calculateOrderTotals({ subtotalCents: 2_500, discountCents: 600 });
  const free = calculateOrderTotals({ subtotalCents: 2_500, discountCents: 4_000 });

  assert.deepEqual(discounted, {
    subtotalCents: 2_500,
    discountCents: 600,
    totalCents: 1_900,
  });
  assert.deepEqual(free, {
    subtotalCents: 2_500,
    discountCents: 2_500,
    totalCents: 0,
  });
});

test("calculateOrderTotals rejects invalid monetary values", () => {
  assert.equal(calculateOrderTotals({ subtotalCents: -1, discountCents: 0 }), null);
  assert.equal(calculateOrderTotals({ subtotalCents: 1_000, discountCents: -10 }), null);
  assert.equal(calculateOrderTotals({ subtotalCents: 99.5, discountCents: 0 }), null);
});
