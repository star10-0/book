import assert from "node:assert/strict";
import test from "node:test";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { SyriatelCashGateway } from "@/lib/payments/gateways/syriatel-cash-gateway";

const gateway = new SyriatelCashGateway();

function setLiveEnv() {
  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SYRIATEL_CASH_API_BASE_URL = "https://syriatel.example";
  process.env.SYRIATEL_CASH_API_KEY = "secret-key";
  process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
  delete process.env.SYRIATEL_CASH_FIND_TX_PATH;
}

test("SyriatelCashGateway create uses manual provider reference in live mode", async () => {
  const originalEnv = { ...process.env };

  setLiveEnv();
  const result = await gateway.createPayment({
    paymentId: "p-1",
    orderId: "o-1",
    amountCents: 1000,
    currency: "SYP",
    customerId: "u-1",
  });

  assert.equal(result.providerReference, "syriatel-manual:p-1");
  assert.deepEqual(result.rawPayload, {
    mode: "live-manual",
    providerReference: "syriatel-manual:p-1",
    destinationAccount: "dest-acc-1",
    amountCents: 1000,
    currency: "SYP",
    orderReference: "o-1",
  });

  process.env = originalEnv;
});

test("SyriatelCashGateway verify rejects destination-account mismatch from find_tx", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "paid",
        amountCents: 1000,
        currency: "SYP",
        destinationAccount: "wrong-destination",
      }),
      { status: 200 },
    );

  await assert.rejects(
    gateway.verifyPayment({
      paymentId: "p-1",
      providerReference: "ref-1",
      transactionReference: "TX-123",
      expectedAmountCents: 1000,
      expectedCurrency: "SYP",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "verify",
  );

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("SyriatelCashGateway verify rejects mismatched amount from find_tx", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "paid",
        amountCents: 999,
        currency: "SYP",
        destinationAccount: "dest-acc-1",
      }),
      { status: 200 },
    );

  await assert.rejects(
    gateway.verifyPayment({
      paymentId: "p-1",
      providerReference: "ref-1",
      transactionReference: "TX-123",
      expectedAmountCents: 1000,
      expectedCurrency: "SYP",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "verify",
  );

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("SyriatelCashGateway verify requires submitted transaction reference", async () => {
  const originalEnv = { ...process.env };
  setLiveEnv();

  await assert.rejects(
    gateway.verifyPayment({
      paymentId: "p-1",
      providerReference: "ref-1",
      expectedAmountCents: 1000,
      expectedCurrency: "SYP",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "verify",
  );

  process.env = originalEnv;
});

test("SyriatelCashGateway blocks mock mode outside explicit development/test mode", async () => {
  const originalEnv = { ...process.env };

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  process.env.PAYMENT_GATEWAY_MODE = "mock";
  process.env.ALLOW_MOCK_PAYMENTS = "false";

  await assert.rejects(
    gateway.createPayment({
      paymentId: "p-1",
      orderId: "o-1",
      amountCents: 1000,
      currency: "SYP",
      customerId: "u-1",
    }),
    (error: unknown) => error instanceof GatewayConfigurationError,
  );

  process.env = originalEnv;
});
