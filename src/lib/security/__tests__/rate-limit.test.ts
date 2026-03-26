import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "@/lib/security/rate-limit";

test("checkRateLimit blocks requests over limit inside same window", async () => {
  const key = `test:${Date.now()}`;

  const first = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  const second = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  const third = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(first.backend, "memory");
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 1);
});

test("checkRateLimit fails closed in production when distributed backend is required", async () => {
  const originalNodeEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
  const originalKvUrl = process.env.KV_REST_API_URL;
  const originalKvToken = process.env.KV_REST_API_TOKEN;
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const result = await checkRateLimit({
    key: `test:prod:${Date.now()}`,
    limit: 5,
    windowMs: 60_000,
    requireDistributedInProduction: true,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.backend, "unavailable");
  assert.equal(result.reason, "RATE_LIMIT_BACKEND_UNAVAILABLE");

  if (typeof originalNodeEnv === "string") (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  else delete (process.env as Record<string, string | undefined>).NODE_ENV;

  if (typeof originalKvUrl === "string") process.env.KV_REST_API_URL = originalKvUrl;
  else delete process.env.KV_REST_API_URL;

  if (typeof originalKvToken === "string") process.env.KV_REST_API_TOKEN = originalKvToken;
  else delete process.env.KV_REST_API_TOKEN;

  if (typeof originalUpstashUrl === "string") process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
  else delete process.env.UPSTASH_REDIS_REST_URL;

  if (typeof originalUpstashToken === "string") process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
  else delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
