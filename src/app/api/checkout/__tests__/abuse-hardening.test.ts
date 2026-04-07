import assert from "node:assert/strict";
import test from "node:test";

import { POST as promoPost } from "@/app/api/checkout/promo/route";
import { POST as completeFreePost } from "@/app/api/checkout/complete-free/route";
import { checkRateLimit } from "@/lib/security/rate-limit";

const DISTRIBUTED_RATE_LIMIT_ENV_KEYS = [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

function clearDistributedRateLimitEnv() {
  for (const key of DISTRIBUTED_RATE_LIMIT_ENV_KEYS) {
    delete process.env[key];
  }
}

function buildMutationRequest(path: string, body: Record<string, string>, forwardedFor: string) {
  return new Request(`https://book.local${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://book.local",
      host: "book.local",
      "x-forwarded-for": forwardedFor,
    },
    body: JSON.stringify(body),
  });
}

test("promo endpoint rate-limit key uses normalized client IP from x-forwarded-for", async () => {
  const originalEnv = { ...process.env };
  try {
    clearDistributedRateLimitEnv();
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const ipPrefix = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    const firstHopB = `${ipPrefix}, 10.0.0.2`;

    for (let index = 0; index < 20; index += 1) {
      await checkRateLimit({
        key: `checkout:promo:${ipPrefix}`,
        limit: 20,
        windowMs: 60_000,
        requireDistributedInProduction: true,
      });
    }

    const limitedResponse = await promoPost(
      buildMutationRequest("/api/checkout/promo", { orderId: "o", code: "c" }, firstHopB),
    );
    assert.equal(limitedResponse.status, 429);
    assert.ok(limitedResponse.headers.get("retry-after"));
  } finally {
    process.env = originalEnv;
  }
});

test("promo endpoint fails safely in production when distributed rate-limit backend is unavailable", async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  try {
    clearDistributedRateLimitEnv();
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://book.local";
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "token";
    global.fetch = async () => new Response("bad", { status: 500 });

    const response = await promoPost(
      buildMutationRequest("/api/checkout/promo", { orderId: "order-1", code: "promo" }, "203.0.113.10"),
    );

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");

    const payload = (await response.json()) as { code?: string };
    assert.equal(payload.code, "RATE_LIMIT_BACKEND_UNAVAILABLE");
  } finally {
    process.env = originalEnv;
    global.fetch = originalFetch;
  }
});

test("complete-free endpoint enforces distributed backend in production when env is misconfigured", async () => {
  const originalEnv = { ...process.env };
  try {
    clearDistributedRateLimitEnv();
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.APP_BASE_URL = "https://book.local";

    const response = await completeFreePost(
      buildMutationRequest("/api/checkout/complete-free", { orderId: "order-1" }, "203.0.113.44"),
    );

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");

    const payload = (await response.json()) as { code?: string };
    assert.equal(payload.code, "RATE_LIMIT_ENV_MISCONFIG");
  } finally {
    process.env = originalEnv;
  }
});

test("complete-free endpoint returns 429 with retry-after when rate-limited", async () => {
  const originalEnv = { ...process.env };
  try {
    clearDistributedRateLimitEnv();
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const requestIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;

    for (let index = 0; index < 20; index += 1) {
      await checkRateLimit({
        key: `checkout:complete-free:${requestIp}`,
        limit: 20,
        windowMs: 60_000,
        requireDistributedInProduction: true,
      });
    }

    const response = await completeFreePost(
      buildMutationRequest("/api/checkout/complete-free", { orderId: "order-1" }, requestIp),
    );

    assert.equal(response.status, 429);
    const retryAfter = response.headers.get("retry-after");
    assert.ok(retryAfter);
    assert.ok(Number(retryAfter) >= 1);
  } finally {
    process.env = originalEnv;
  }
});
