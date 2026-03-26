import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "@/lib/security/rate-limit";

test("checkRateLimit uses KV backend when available", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "token";

  global.fetch = async () =>
    new Response(
      JSON.stringify([
        { result: 1 },
        { result: 1 },
      ]),
      { status: 200 },
    );

  const result = await checkRateLimit({ key: `test:kv:${Date.now()}`, limit: 2, windowMs: 60_000 });

  assert.equal(result.allowed, true);
  assert.equal(result.backend, "kv");

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("checkRateLimit fails closed when KV backend is unavailable", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "token";

  global.fetch = async () => new Response("bad", { status: 500 });

  const result = await checkRateLimit({
    key: `test:unavailable:${Date.now()}`,
    limit: 5,
    windowMs: 60_000,
    requireDistributedInProduction: true,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.backend, "unavailable");
  assert.equal(result.reason, "RATE_LIMIT_BACKEND_UNAVAILABLE");
  assert.equal(result.details, "kv_request_failed");

  process.env = originalEnv;
  global.fetch = originalFetch;
});

test("checkRateLimit falls back to memory backend in development when KV is unavailable", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  process.env.KV_REST_API_URL = "https://kv.example";
  process.env.KV_REST_API_TOKEN = "token";

  global.fetch = async () => new Response("bad", { status: 500 });

  const result = await checkRateLimit({
    key: `test:dev-memory:${Date.now()}`,
    limit: 5,
    windowMs: 60_000,
    requireDistributedInProduction: true,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.backend, "memory");

  process.env = originalEnv;
  global.fetch = originalFetch;
});
