import assert from "node:assert/strict";
import test from "node:test";
import { getProviderIntegrationConfig } from "@/lib/payments/gateways/provider-integration";

test("getProviderIntegrationConfig reports missing env for Sham Cash only", () => {
  const originalEnv = { ...process.env };

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SHAM_CASH_API_BASE_URL = "https://sham.example";
  process.env.SHAM_CASH_API_KEY = "secret-key";
  process.env.SHAM_CASH_MERCHANT_ID = "merchant-1";
  process.env.SHAM_CASH_DESTINATION_ACCOUNT = "dest-acc-1";
  process.env.SHAM_CASH_CREATE_PAYMENT_PATH = "/create";
  process.env.SHAM_CASH_VERIFY_PAYMENT_PATH = "/verify";
  delete process.env.SHAM_CASH_WEBHOOK_SECRET;

  const integration = getProviderIntegrationConfig("SHAM_CASH");
  assert.ok(integration);
  assert.equal(integration.mode, "live");
  assert.equal(integration.isLiveConfigured, false);
  assert.deepEqual(integration.missingEnvKeys, ["SHAM_CASH_WEBHOOK_SECRET"]);

  process.env = originalEnv;
});

test("getProviderIntegrationConfig reports missing env for Syriatel Cash only", () => {
  const originalEnv = { ...process.env };

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SYRIATEL_CASH_API_BASE_URL = "https://syriatel.example";
  process.env.SYRIATEL_CASH_API_KEY = "secret-key";
  process.env.SYRIATEL_CASH_MERCHANT_ID = "merchant-1";
  process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH = "/create";
  process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH = "/verify";
  delete process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;

  const integration = getProviderIntegrationConfig("SYRIATEL_CASH");
  assert.ok(integration);
  assert.equal(integration.mode, "live");
  assert.equal(integration.isLiveConfigured, false);
  assert.deepEqual(integration.missingEnvKeys, ["SYRIATEL_CASH_DESTINATION_ACCOUNT"]);

  process.env = originalEnv;
});
