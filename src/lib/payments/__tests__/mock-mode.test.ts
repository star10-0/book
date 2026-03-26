import assert from "node:assert/strict";
import test from "node:test";
import { isMockPaymentGatewayEnabled, isMockPaymentVerificationEnabled } from "@/lib/payments/mock-mode";

test("mock verification is enabled only in development/test and mock mode", () => {
  const originalNodeEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
  const originalAllowMock = process.env.ALLOW_MOCK_PAYMENT_VERIFICATION;
  const originalGatewayMode = process.env.PAYMENT_GATEWAY_MODE;

  process.env.ALLOW_MOCK_PAYMENT_VERIFICATION = "true";

  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  process.env.PAYMENT_GATEWAY_MODE = "mock";
  assert.equal(isMockPaymentVerificationEnabled(), true);

  process.env.PAYMENT_GATEWAY_MODE = "live";
  assert.equal(isMockPaymentVerificationEnabled(), false);

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  process.env.PAYMENT_GATEWAY_MODE = "mock";
  assert.equal(isMockPaymentVerificationEnabled(), false);

  if (typeof originalNodeEnv === "string") {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  } else {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  }

  if (typeof originalAllowMock === "string") {
    process.env.ALLOW_MOCK_PAYMENT_VERIFICATION = originalAllowMock;
  } else {
    delete process.env.ALLOW_MOCK_PAYMENT_VERIFICATION;
  }

  if (typeof originalGatewayMode === "string") {
    process.env.PAYMENT_GATEWAY_MODE = originalGatewayMode;
  } else {
    delete process.env.PAYMENT_GATEWAY_MODE;
  }
});

test("mock gateway mode requires explicit opt-in and non-production environment", () => {
  const originalNodeEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
  const originalAllowMockGateways = process.env.ALLOW_MOCK_PAYMENTS;
  const originalGatewayMode = process.env.PAYMENT_GATEWAY_MODE;

  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  process.env.PAYMENT_GATEWAY_MODE = "mock";
  process.env.ALLOW_MOCK_PAYMENTS = "false";
  assert.equal(isMockPaymentGatewayEnabled(), false);

  process.env.ALLOW_MOCK_PAYMENTS = "true";
  assert.equal(isMockPaymentGatewayEnabled(), true);

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  assert.equal(isMockPaymentGatewayEnabled(), false);

  if (typeof originalNodeEnv === "string") {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  } else {
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
  }

  if (typeof originalAllowMockGateways === "string") {
    process.env.ALLOW_MOCK_PAYMENTS = originalAllowMockGateways;
  } else {
    delete process.env.ALLOW_MOCK_PAYMENTS;
  }

  if (typeof originalGatewayMode === "string") {
    process.env.PAYMENT_GATEWAY_MODE = originalGatewayMode;
  } else {
    delete process.env.PAYMENT_GATEWAY_MODE;
  }
});
