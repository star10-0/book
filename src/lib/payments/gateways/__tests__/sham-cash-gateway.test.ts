import assert from "node:assert/strict";
import test from "node:test";
import { ShamCashGateway } from "@/lib/payments/gateways/sham-cash-gateway";
import { GatewayRequestError } from "@/lib/payments/gateways/provider-http";

const gateway = new ShamCashGateway();

function setLiveEnv() {
  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SHAM_CASH_API_BASE_URL = "https://sham.example";
  process.env.SHAM_CASH_API_KEY = "secret-key";
  process.env.SHAM_CASH_MERCHANT_ID = "merchant-1";
  process.env.SHAM_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
  process.env.SHAM_CASH_CREATE_PAYMENT_PATH = "/create";
  process.env.SHAM_CASH_VERIFY_PAYMENT_PATH = "/verify";
  process.env.SHAM_CASH_WEBHOOK_SECRET = "whsec";
  process.env.APP_BASE_URL = "https://book.example";
}

test("ShamCashGateway verify rejects mismatched amount from provider", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "paid",
        amountCents: 990,
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

test("ShamCashGateway create rejects destination-account mismatch from provider", async () => {
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
