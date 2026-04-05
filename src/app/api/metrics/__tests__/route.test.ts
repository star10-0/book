import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMetricsAuth } from "@/app/api/metrics/route";

test("metrics auth fails closed in production when token is missing", () => {
  const original = { ...process.env };
  delete process.env.METRICS_TOKEN;
  Object.assign(process.env, { NODE_ENV: "production" });

  const result = evaluateMetricsAuth(new Request("https://book.local/api/metrics"));
  assert.deepEqual(result, { ok: false, status: 503, reason: "TOKEN_UNSET_IN_PRODUCTION" });

  process.env = original;
});

test("metrics auth allows non-production without token", () => {
  const original = { ...process.env };
  delete process.env.METRICS_TOKEN;
  Object.assign(process.env, { NODE_ENV: "development" });

  const result = evaluateMetricsAuth(new Request("https://book.local/api/metrics"));
  assert.deepEqual(result, { ok: true });

  process.env = original;
});

test("metrics auth requires matching token when configured", () => {
  const original = { ...process.env };
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.METRICS_TOKEN = "token-1";

  const bad = evaluateMetricsAuth(new Request("https://book.local/api/metrics"));
  assert.deepEqual(bad, { ok: false, status: 401, reason: "UNAUTHORIZED" });

  const good = evaluateMetricsAuth(
    new Request("https://book.local/api/metrics", { headers: { Authorization: "Bearer token-1" } }),
  );
  assert.deepEqual(good, { ok: true });

  process.env = original;
});
