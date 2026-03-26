import assert from "node:assert/strict";
import test from "node:test";
import { getAppBaseUrl, validateServerEnv } from "@/lib/env";

test("validateServerEnv reports missing required variables", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  delete process.env.AUTH_SECRET;
  delete process.env.DATABASE_URL;

  const result = validateServerEnv();

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((issue) => issue.key === "AUTH_SECRET"));
  assert.ok(result.errors.some((issue) => issue.key === "DATABASE_URL"));

  if (typeof originalAuthSecret === "string") {
    process.env.AUTH_SECRET = originalAuthSecret;
  } else {
    delete process.env.AUTH_SECRET;
  }

  if (typeof originalDatabaseUrl === "string") {
    process.env.DATABASE_URL = originalDatabaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }
});

test("getAppBaseUrl falls back safely for invalid APP_BASE_URL", () => {
  const original = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = "not a url";

  assert.equal(getAppBaseUrl(), "https://book.example");

  if (typeof original === "string") {
    process.env.APP_BASE_URL = original;
  } else {
    delete process.env.APP_BASE_URL;
  }
});


test("validateServerEnv requires production deployment vars", () => {
  const originalNodeEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
  const originalAppBaseUrl = process.env.APP_BASE_URL;
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;
  const originalPaymentMode = process.env.PAYMENT_GATEWAY_MODE;
  const originalStorageProvider = process.env.BOOK_STORAGE_PROVIDER;
  const originalAuthSecret = process.env.AUTH_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  process.env.AUTH_SECRET = "12345678901234567890123456789012";
  process.env.DATABASE_URL = "postgresql://localhost:5432/book";

  delete process.env.APP_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.PAYMENT_GATEWAY_MODE;
  delete process.env.BOOK_STORAGE_PROVIDER;

  const result = validateServerEnv();

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((issue) => issue.key === "APP_BASE_URL"));
  assert.ok(result.errors.some((issue) => issue.key === "NEXTAUTH_URL"));
  assert.ok(result.errors.some((issue) => issue.key === "PAYMENT_GATEWAY_MODE"));
  assert.ok(result.errors.some((issue) => issue.key === "BOOK_STORAGE_PROVIDER"));
  assert.ok(result.errors.some((issue) => issue.key === "KV_REST_API_URL"));

  if (typeof originalNodeEnv === "string") (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  else delete (process.env as Record<string, string | undefined>).NODE_ENV;

  if (typeof originalAppBaseUrl === "string") process.env.APP_BASE_URL = originalAppBaseUrl;
  else delete process.env.APP_BASE_URL;

  if (typeof originalNextAuthUrl === "string") process.env.NEXTAUTH_URL = originalNextAuthUrl;
  else delete process.env.NEXTAUTH_URL;

  if (typeof originalPaymentMode === "string") process.env.PAYMENT_GATEWAY_MODE = originalPaymentMode;
  else delete process.env.PAYMENT_GATEWAY_MODE;

  if (typeof originalStorageProvider === "string") process.env.BOOK_STORAGE_PROVIDER = originalStorageProvider;
  else delete process.env.BOOK_STORAGE_PROVIDER;

  if (typeof originalAuthSecret === "string") process.env.AUTH_SECRET = originalAuthSecret;
  else delete process.env.AUTH_SECRET;

  if (typeof originalDatabaseUrl === "string") process.env.DATABASE_URL = originalDatabaseUrl;
  else delete process.env.DATABASE_URL;
});

test("validateServerEnv requires Sham Cash live credentials when live mode is enabled", () => {
  const originalPaymentMode = process.env.PAYMENT_GATEWAY_MODE;
  const originalShamDestination = process.env.SHAM_CASH_DESTINATION_ACCOUNT;

  process.env.PAYMENT_GATEWAY_MODE = "live";
  delete process.env.SHAM_CASH_DESTINATION_ACCOUNT;

  const result = validateServerEnv();
  assert.ok(result.issues.some((issue) => issue.key === "SHAM_CASH_DESTINATION_ACCOUNT"));

  if (typeof originalPaymentMode === "string") process.env.PAYMENT_GATEWAY_MODE = originalPaymentMode;
  else delete process.env.PAYMENT_GATEWAY_MODE;

  if (typeof originalShamDestination === "string") process.env.SHAM_CASH_DESTINATION_ACCOUNT = originalShamDestination;
  else delete process.env.SHAM_CASH_DESTINATION_ACCOUNT;
});
