import { strict as assert } from "node:assert";
import test from "node:test";
import { normalizeNonNegativeMoneyCents, normalizeProviderReference, normalizeRating } from "@/lib/services/invariants";

test("normalizeRating accepts integers 1..5 only", () => {
  assert.equal(normalizeRating("5"), 5);
  assert.equal(normalizeRating(1), 1);
  assert.equal(normalizeRating(0), null);
  assert.equal(normalizeRating("6"), null);
  assert.equal(normalizeRating("2.5"), null);
});

test("normalizeNonNegativeMoneyCents accepts non-negative integers only", () => {
  assert.equal(normalizeNonNegativeMoneyCents(0), 0);
  assert.equal(normalizeNonNegativeMoneyCents(1500), 1500);
  assert.equal(normalizeNonNegativeMoneyCents(-1), null);
  assert.equal(normalizeNonNegativeMoneyCents(10.5), null);
});

test("normalizeProviderReference trims and rejects empty values", () => {
  assert.equal(normalizeProviderReference("  ref-123  "), "ref-123");
  assert.equal(normalizeProviderReference("   "), null);
  assert.equal(normalizeProviderReference(null), null);
});

