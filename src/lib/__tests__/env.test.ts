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

test("validateServerEnv in live mode requires selected live provider env vars only", () => {
  const originalPaymentMode = process.env.PAYMENT_GATEWAY_MODE;
  const originalLiveProviders = process.env.PAYMENT_LIVE_PROVIDERS;
  const originalShamBaseUrl = process.env.SHAM_CASH_API_BASE_URL;
  const originalShamApiKey = process.env.SHAM_CASH_API_KEY;
  const originalShamDestination = process.env.SHAM_CASH_DESTINATION_ACCOUNT;
  const originalSyriatelBaseUrl = process.env.SYRIATEL_CASH_API_BASE_URL;
  const originalSyriatelApiKey = process.env.SYRIATEL_CASH_API_KEY;
  const originalSyriatelMerchantId = process.env.SYRIATEL_CASH_MERCHANT_ID;
  const originalSyriatelDestination = process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;
  const originalSyriatelCreatePath = process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH;
  const originalSyriatelVerifyPath = process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH;

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.PAYMENT_LIVE_PROVIDERS = "SHAM_CASH";
  delete process.env.SHAM_CASH_API_BASE_URL;
  delete process.env.SHAM_CASH_API_KEY;
  delete process.env.SHAM_CASH_DESTINATION_ACCOUNT;
  delete process.env.SYRIATEL_CASH_API_BASE_URL;
  delete process.env.SYRIATEL_CASH_API_KEY;
  delete process.env.SYRIATEL_CASH_MERCHANT_ID;
  delete process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;
  delete process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH;
  delete process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH;

  const result = validateServerEnv();
  assert.ok(result.issues.some((issue) => issue.key === "SHAM_CASH_API_BASE_URL"));
  assert.ok(result.issues.some((issue) => issue.key === "SHAM_CASH_DESTINATION_ACCOUNT"));
  assert.ok(result.issues.some((issue) => issue.key === "SHAM_CASH_API_KEY"));
  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_API_BASE_URL"), false);

  if (typeof originalPaymentMode === "string") process.env.PAYMENT_GATEWAY_MODE = originalPaymentMode;
  else delete process.env.PAYMENT_GATEWAY_MODE;

  if (typeof originalLiveProviders === "string") process.env.PAYMENT_LIVE_PROVIDERS = originalLiveProviders;
  else delete process.env.PAYMENT_LIVE_PROVIDERS;

  if (typeof originalShamBaseUrl === "string") process.env.SHAM_CASH_API_BASE_URL = originalShamBaseUrl;
  else delete process.env.SHAM_CASH_API_BASE_URL;

  if (typeof originalShamApiKey === "string") process.env.SHAM_CASH_API_KEY = originalShamApiKey;
  else delete process.env.SHAM_CASH_API_KEY;

  if (typeof originalShamDestination === "string") process.env.SHAM_CASH_DESTINATION_ACCOUNT = originalShamDestination;
  else delete process.env.SHAM_CASH_DESTINATION_ACCOUNT;

  if (typeof originalSyriatelBaseUrl === "string") process.env.SYRIATEL_CASH_API_BASE_URL = originalSyriatelBaseUrl;
  else delete process.env.SYRIATEL_CASH_API_BASE_URL;

  if (typeof originalSyriatelApiKey === "string") process.env.SYRIATEL_CASH_API_KEY = originalSyriatelApiKey;
  else delete process.env.SYRIATEL_CASH_API_KEY;

  if (typeof originalSyriatelMerchantId === "string") process.env.SYRIATEL_CASH_MERCHANT_ID = originalSyriatelMerchantId;
  else delete process.env.SYRIATEL_CASH_MERCHANT_ID;

  if (typeof originalSyriatelDestination === "string") process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT = originalSyriatelDestination;
  else delete process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;

  if (typeof originalSyriatelCreatePath === "string") process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH = originalSyriatelCreatePath;
  else delete process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH;

  if (typeof originalSyriatelVerifyPath === "string") process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH = originalSyriatelVerifyPath;
  else delete process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH;
});

test("validateServerEnv reports invalid PAYMENT_LIVE_PROVIDERS entries", () => {
  const originalPaymentMode = process.env.PAYMENT_GATEWAY_MODE;
  const originalLiveProviders = process.env.PAYMENT_LIVE_PROVIDERS;

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.PAYMENT_LIVE_PROVIDERS = "SHAM_CASH,UNKNOWN_PROVIDER";

  const result = validateServerEnv();

  assert.ok(result.issues.some((issue) => issue.key === "PAYMENT_LIVE_PROVIDERS" && issue.message.includes("unsupported providers")));

  if (typeof originalPaymentMode === "string") process.env.PAYMENT_GATEWAY_MODE = originalPaymentMode;
  else delete process.env.PAYMENT_GATEWAY_MODE;

  if (typeof originalLiveProviders === "string") process.env.PAYMENT_LIVE_PROVIDERS = originalLiveProviders;
  else delete process.env.PAYMENT_LIVE_PROVIDERS;
});



test("validateServerEnv in live mode requires only Syriatel manual-transfer env vars", () => {
  const originalPaymentMode = process.env.PAYMENT_GATEWAY_MODE;
  const originalLiveProviders = process.env.PAYMENT_LIVE_PROVIDERS;
  const originalSyriatelBaseUrl = process.env.SYRIATEL_CASH_API_BASE_URL;
  const originalSyriatelApiKey = process.env.SYRIATEL_CASH_API_KEY;
  const originalSyriatelDestination = process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;
  const originalSyriatelMerchantId = process.env.SYRIATEL_CASH_MERCHANT_ID;
  const originalSyriatelCreatePath = process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH;
  const originalSyriatelVerifyPath = process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH;

  process.env.PAYMENT_GATEWAY_MODE = "live";
  process.env.PAYMENT_LIVE_PROVIDERS = "SYRIATEL_CASH";
  process.env.SYRIATEL_CASH_API_BASE_URL = "https://syriatel.example";
  process.env.SYRIATEL_CASH_API_KEY = "secret";
  process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT = "9639XXXXXXX";
  delete process.env.SYRIATEL_CASH_MERCHANT_ID;
  delete process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH;
  delete process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH;

  const result = validateServerEnv();

  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_API_BASE_URL"), false);
  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_API_KEY"), false);
  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_DESTINATION_ACCOUNT"), false);
  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_MERCHANT_ID"), false);
  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_CREATE_PAYMENT_PATH"), false);
  assert.equal(result.issues.some((issue) => issue.key === "SYRIATEL_CASH_VERIFY_PAYMENT_PATH"), false);

  if (typeof originalPaymentMode === "string") process.env.PAYMENT_GATEWAY_MODE = originalPaymentMode;
  else delete process.env.PAYMENT_GATEWAY_MODE;

  if (typeof originalLiveProviders === "string") process.env.PAYMENT_LIVE_PROVIDERS = originalLiveProviders;
  else delete process.env.PAYMENT_LIVE_PROVIDERS;

  if (typeof originalSyriatelBaseUrl === "string") process.env.SYRIATEL_CASH_API_BASE_URL = originalSyriatelBaseUrl;
  else delete process.env.SYRIATEL_CASH_API_BASE_URL;

  if (typeof originalSyriatelApiKey === "string") process.env.SYRIATEL_CASH_API_KEY = originalSyriatelApiKey;
  else delete process.env.SYRIATEL_CASH_API_KEY;

  if (typeof originalSyriatelDestination === "string") process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT = originalSyriatelDestination;
  else delete process.env.SYRIATEL_CASH_DESTINATION_ACCOUNT;

  if (typeof originalSyriatelMerchantId === "string") process.env.SYRIATEL_CASH_MERCHANT_ID = originalSyriatelMerchantId;
  else delete process.env.SYRIATEL_CASH_MERCHANT_ID;

  if (typeof originalSyriatelCreatePath === "string") process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH = originalSyriatelCreatePath;
  else delete process.env.SYRIATEL_CASH_CREATE_PAYMENT_PATH;

  if (typeof originalSyriatelVerifyPath === "string") process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH = originalSyriatelVerifyPath;
  else delete process.env.SYRIATEL_CASH_VERIFY_PAYMENT_PATH;
});

test("validateServerEnv requires cloud storage vars for s3/r2 providers", () => {
  const originalProvider = process.env.BOOK_STORAGE_PROVIDER;
  const originalKey = process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;
  const originalSecret = process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;
  const originalBucket = process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;

  process.env.BOOK_STORAGE_PROVIDER = "s3";
  delete process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;
  delete process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;
  delete process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;

  const result = validateServerEnv();

  assert.ok(result.issues.some((issue) => issue.key === "BOOK_STORAGE_S3_ACCESS_KEY_ID"));
  assert.ok(result.issues.some((issue) => issue.key === "BOOK_STORAGE_S3_SECRET_ACCESS_KEY"));
  assert.ok(result.issues.some((issue) => issue.key === "BOOK_STORAGE_S3_PUBLIC_BUCKET"));

  if (typeof originalProvider === "string") process.env.BOOK_STORAGE_PROVIDER = originalProvider;
  else delete process.env.BOOK_STORAGE_PROVIDER;

  if (typeof originalKey === "string") process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID = originalKey;
  else delete process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;

  if (typeof originalSecret === "string") process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY = originalSecret;
  else delete process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;

  if (typeof originalBucket === "string") process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET = originalBucket;
  else delete process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;
});
