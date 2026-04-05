import assert from "node:assert/strict";
import test from "node:test";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { SyriatelCashGateway } from "@/lib/payments/gateways/syriatel-cash-gateway";

const gateway = new SyriatelCashGateway();

function setLiveEnv() {
  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SYRIATEL_CASH_API_BASE_URL = "https://apisyria.com/api/v1";
  process.env.SYRIATEL_CASH_API_KEY = "secret-key";
  process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
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
        success: true,
        data: {
          found: true,
          transaction: {
            transaction_no: "TX-123",
            to: "wrong-destination",
            amount: 10,
            currency: "SYP",
          },
          account: {
            gsm: "wrong-destination",
          },
        },
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
        success: true,
        data: {
          found: true,
          transaction: {
            transaction_no: "TX-123",
            to: "dest-acc-1",
            amount: 9,
            currency: "SYP",
          },
          account: {
            gsm: "dest-acc-1",
          },
        },
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

test("SyriatelCashGateway verify uses API SYRIA find_tx GET contract and returns paid result", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();
  let requestUrl = "";
  let requestMethod = "";
  let requestApiKey = "";

  global.fetch = async (input, init) => {
    requestUrl = typeof input === "string" ? input : input.toString();
    requestMethod = init?.method ?? "GET";
    requestApiKey = new Headers(init?.headers).get("X-Api-Key") ?? "";

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          found: true,
          transaction: {
            transaction_no: "TX-123",
            date: "2026-03-30T10:00:00Z",
            from: "wallet-1",
            to: "dest-acc-1",
            amount: 10,
          },
          account: {
            gsm: "dest-acc-1",
            cash_code: "cash-123",
          },
        },
      }),
      { status: 200 },
    );
  };

  const result = await gateway.verifyPayment({
    paymentId: "p-1",
    providerReference: "ref-1",
    transactionReference: "TX-123",
    expectedAmountCents: 1000,
    expectedCurrency: "SYP",
  });

  assert.equal(
    requestUrl,
    "https://apisyria.com/api/v1?resource=syriatel&action=find_tx&tx=TX-123&gsm=dest-acc-1",
  );
  assert.equal(requestMethod, "GET");
  assert.equal(requestApiKey, "secret-key");
  assert.equal(result.isPaid, true);

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("SyriatelCashGateway verify normalizes major-unit string amount into cents", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          found: true,
          transaction: {
            transaction_no: "TX-100",
            to: "dest-acc-1",
            amount: "100",
            currency: "SYP",
          },
          account: {
            gsm: "dest-acc-1",
          },
        },
      }),
      { status: 200 },
    );

  const result = await gateway.verifyPayment({
    paymentId: "p-1",
    providerReference: "ref-1",
    transactionReference: "TX-100",
    expectedAmountCents: 10000,
    expectedCurrency: "SYP",
  });

  assert.equal(result.isPaid, true);

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("SyriatelCashGateway verify prefers amountCents over amount when both are present", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  setLiveEnv();

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          found: true,
          transaction: {
            transaction_no: "TX-777",
            to: "dest-acc-1",
            amount: 20,
            amountCents: 1000,
            currency: "SYP",
          },
          account: {
            gsm: "dest-acc-1",
          },
        },
      }),
      { status: 200 },
    );

  const result = await gateway.verifyPayment({
    paymentId: "p-1",
    providerReference: "ref-1",
    transactionReference: "TX-777",
    expectedAmountCents: 1000,
    expectedCurrency: "SYP",
  });

  assert.equal(result.isPaid, true);

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
