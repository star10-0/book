import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "@/lib/security/rate-limit";

test("checkRateLimit blocks requests over limit inside same window", () => {
  const key = `test:${Date.now()}`;

  const first = checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  const second = checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  const third = checkRateLimit({ key, limit: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterSeconds >= 1);
});
