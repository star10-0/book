import assert from "node:assert/strict";
import test from "node:test";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { SyriatelCashGateway } from "@/lib/payments/gateways/syriatel-cash-gateway";

const gateway = new SyriatelCashGateway();

function setLiveEnv() {
  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SYRIATEL_CASH_API_BASE_URL = "https://syriatel.example";
  process.env.SYRIATEL_CASH_API_KEY = "secret-key";
  process.env.SYRIATEL_CASH_MERCHANT_ID = "merchant-1";
  process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
  process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH = "/create";
  process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH = "/verify";
}

test("SyriatelCashGateway create rejects destination-account mismatch from provider", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        providerReference: "provider-ref-1",
        status: "submitted",
        amountCents: 1000,
        currency: "SYP",
        destinationAccount: "wrong-destination",
      }),
      { status: 200 },
    );

  await assert.rejects(
    gateway.createPayment({
      paymentId: "p-1",
      orderId: "o-1",
      amountCents: 1000,
      currency: "SYP",
      customerId: "u-1",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "create",
  );

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("SyriatelCashGateway verify rejects mismatched amount from provider", async () => {
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
      expectedAmountCents: 1000,
      expectedCurrency: "SYP",
    }),
    (error: unknown) => error instanceof GatewayRequestError && error.phase === "verify",
  );

  process.env = originalEnv;
  global.fetch = originalFetch;
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
