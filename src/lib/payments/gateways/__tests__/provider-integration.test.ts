import assert from "node:assert/strict";
import test from "node:test";
import { getProviderIntegrationConfig, parseSelectedLiveProviders } from "@/lib/payments/gateways/provider-integration";

test("getProviderIntegrationConfig reports missing env for Sham Cash only", () => {
  const originalEnv = { ...process.env };

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SHAM_CASH_API_BASE_URL = "https://sham.example";
  process.env.SHAM_CASH_API_KEY = "secret-key";
  delete process.env.SHAM_CASH_DESTINATION_ACCOUNT;

  const integration = getProviderIntegrationConfig("SHAM_CASH");
  assert.ok(integration);
  assert.equal(integration.mode, "live");
  assert.equal(integration.isLiveConfigured, false);
  assert.deepEqual(integration.missingEnvKeys, ["SHAM_CASH_DESTINATION_ACCOUNT"]);

  process.env = originalEnv;
});

test("getProviderIntegrationConfig reports missing env for Syriatel Cash only", () => {
  const originalEnv = { ...process.env };

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.SYRIATEL_CASH_API_BASE_URL = "https://syriatel.example";
  process.env.SYRIATEL_CASH_API_KEY = "secret-key";
  delete process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;

  const integration = getProviderIntegrationConfig("SYRIATEL_CASH");
  assert.ok(integration);
  assert.equal(integration.mode, "live");
  assert.equal(integration.isLiveConfigured, false);
  assert.deepEqual(integration.missingEnvKeys, ["SYRIATEL_CASH_DESTINATION_ACCOUNT"]);

  process.env = originalEnv;
});

test("parseSelectedLiveProviders defaults to Sham Cash when env is missing", () => {
  const originalEnv = { ...process.env };
  delete process.env.PAYMENT_LIVE_PROVIDERS;

  const selection = parseSelectedLiveProviders();

  assert.deepEqual(selection.selectedProviders, ["SHAM_CASH"]);
  assert.deepEqual(selection.invalidProviders, []);
  assert.equal(selection.source, "default");

  process.env = originalEnv;
});

test("parseSelectedLiveProviders accepts CSV and reports invalid entries", () => {
  const originalEnv = { ...process.env };
  process.env.PAYMENT_LIVE_PROVIDERS = " sham_cash,invalid_value, SHAM_CASH ";

  const selection = parseSelectedLiveProviders();

  assert.deepEqual(selection.selectedProviders, ["SHAM_CASH"]);
  assert.deepEqual(selection.invalidProviders, ["INVALID_VALUE"]);
  assert.equal(selection.source, "env");

  process.env = originalEnv;
});

test("parseSelectedLiveProviders accepts quoted provider values", () => {
  const originalEnv = { ...process.env };
  process.env.PAYMENT_LIVE_PROVIDERS = "\"SHAM_CASH\"";

  const selection = parseSelectedLiveProviders();

  assert.deepEqual(selection.selectedProviders, ["SHAM_CASH"]);
  assert.deepEqual(selection.invalidProviders, []);
  assert.equal(selection.source, "env");

  process.env = originalEnv;
});
