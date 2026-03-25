import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "@/lib/security/rate-limit";

test("checkRateLimit blocks requests over limit inside same window", async () => {
  const key = `test:${Date.now()}`;

  const first = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  const second = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  const third = await checkRateLimit({ key, limit: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 1);
});
