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
