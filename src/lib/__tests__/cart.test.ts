import assert from "node:assert/strict";
import test from "node:test";
import { addItemToCart, getCartItemsCount, parseCartCookie, serializeCartCookie } from "@/lib/cart";

test("addItemToCart keeps digital items unique without incrementing quantity", () => {
  const initial = [{ bookId: "book-1", offerId: "offer-1", quantity: 1 }];
  const updated = addItemToCart(initial, "book-1", "offer-1");

  assert.equal(updated.length, 1);
  assert.equal(updated[0]?.quantity, 1);
});

test("parseCartCookie normalizes invalid and duplicate quantities", () => {
  const raw = serializeCartCookie([
    { bookId: "book-1", offerId: "offer-1", quantity: 4 },
    { bookId: "book-1", offerId: "offer-1", quantity: 2 },
    { bookId: "book-2", offerId: "offer-2", quantity: 1 },
  ]);

  const parsed = parseCartCookie(raw);

  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed, [
    { bookId: "book-1", offerId: "offer-1", quantity: 1 },
    { bookId: "book-2", offerId: "offer-2", quantity: 1 },
  ]);
});

test("getCartItemsCount returns unique item count", () => {
  const count = getCartItemsCount([
    { bookId: "book-1", offerId: "offer-1", quantity: 1 },
    { bookId: "book-2", offerId: "offer-2", quantity: 1 },
  ]);

  assert.equal(count, 2);
});
