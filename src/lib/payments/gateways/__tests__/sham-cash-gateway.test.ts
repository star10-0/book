import assert from "node:assert/strict";
import test from "node:test";
import { ShamCashGateway } from "@/lib/payments/gateways/sham-cash-gateway";
import { GatewayRequestError } from "@/lib/payments/gateways/provider-http";

const gateway = new ShamCashGateway();

function setLiveEnv() {
  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SHAM_CASH_API_BASE_URL = "https://sham.example";
  process.env.SHAM_CASH_API_KEY = "secret-key";
  process.env.SHAM_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
  process.env.APP_BASE_URL = "https://book.example";
}

test("ShamCashGateway create returns internal manual provider reference", async () => {
  const originalEnv = { ...process.env };
  setLiveEnv();

  const result = await gateway.createPayment({
    paymentId: "p-1",
    orderId: "o-1",
    amountCents: 1000,
    currency: "SYP",
    customerId: "u-1",
  });

  assert.equal(result.providerReference, "sham-manual:p-1");
  assert.equal(result.rawPayload?.destinationAccount, "dest-acc-1");
  assert.equal(result.rawPayload?.orderReference, "o-1");
  assert.equal(result.checkoutUrl, undefined);

  process.env = originalEnv;
});

test("ShamCashGateway verify rejects mismatched amount from provider", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        found: true,
        transaction: {
          tran_id: 162045000,
          amount: 9.9,
          currency: "SYP",
        },
        account: {
          account_address: "dest-acc-1",
        },
      }),
      { status: 200 },
    );

  await assert.rejects(
    gateway.verifyPayment({
      paymentId: "p-1",
      providerReference: "ref-1",
      transactionReference: "tx-123",
      expectedAmountCents: 1000,
      expectedCurrency: "SYP",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "verify",
  );

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("ShamCashGateway verify rejects destination-account mismatch from provider", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        found: true,
        transaction: {
          tran_id: 162045000,
          amount: 10,
          currency: "SYP",
        },
        account: {
          account_address: "wrong-destination",
        },
      }),
      { status: 200 },
    );

  await assert.rejects(
    gateway.verifyPayment({
      paymentId: "p-1",
      providerReference: "ref-1",
      transactionReference: "tx-123",
      expectedAmountCents: 1000,
      expectedCurrency: "SYP",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "verify",
  );

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("ShamCashGateway verify accepts real find_tx response shape when transaction is valid", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        found: true,
        transaction: {
          tran_id: 162045000,
          from_name: "sender",
          to_name: "merchant",
          currency: "SYP",
          amount: 14,
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

  const result = await gateway.verifyPayment({
    paymentId: "p-1",
    providerReference: "ref-1",
    transactionReference: "162045000",
    expectedAmountCents: 1400,
    expectedCurrency: "SYP",
  });

  assert.equal(result.isPaid, true);
  assert.equal(result.failureReason, undefined);

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("ShamCashGateway verify marks transaction unpaid when account details are missing", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        found: true,
        transaction: {
          tran_id: 162045000,
          from_name: "sender",
          to_name: "merchant",
          currency: "SYP",
          amount: 14,
          datetime: "2026-03-28 15:52:17",
          note: "",
        },
      }),
      { status: 200 },
    );

  const result = await gateway.verifyPayment({
    paymentId: "p-1",
    providerReference: "ref-1",
    transactionReference: "162045000",
    expectedAmountCents: 1400,
    expectedCurrency: "SYP",
  });

  assert.equal(result.isPaid, false);
  assert.match(result.failureReason ?? "", /destination account details/i);

  process.env = originalEnv;
  global.fetch = originalFetch;
});
