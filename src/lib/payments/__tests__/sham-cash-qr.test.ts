import assert from "node:assert/strict";
import test from "node:test";
import { buildShamCashQrPayload } from "@/lib/payments/sham-cash-qr";

test("buildShamCashQrPayload returns structured fallback payload", () => {
  const result = buildShamCashQrPayload({
    destinationAccount: "  0999999  ",
    amountMajor: 1200,
    currency: "SYP",
    orderReference: "ord_123",
  });

  assert.equal(result.format, "fallback-json-v1");

  const payload = JSON.parse(result.payload) as {
    schema: string;
    provider: string;
    destinationAccount: string;
    amount: number;
    currency: string;
    orderReference: string;
    issuedAt: string;
  };

  assert.equal(payload.schema, "book.sham_cash.manual_transfer.v1");
  assert.equal(payload.provider, "SHAM_CASH");
  assert.equal(payload.destinationAccount, "0999999");
  assert.equal(payload.amount, 1200);
  assert.equal(payload.currency, "SYP");
  assert.equal(payload.orderReference, "ord_123");
  assert.ok(Number.isFinite(Date.parse(payload.issuedAt)));
});
