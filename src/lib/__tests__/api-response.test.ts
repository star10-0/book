import assert from "node:assert/strict";
import test from "node:test";
import { API_ERROR_CODES, buildErrorPayload, parseJsonBody } from "@/lib/api-response";

test("buildErrorPayload standardizes error response shape", () => {
  const payload = buildErrorPayload(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.");

  assert.deepEqual(payload, {
    ok: false,
    message: "يجب تسجيل الدخول أولاً.",
    error: {
      code: API_ERROR_CODES.unauthorized,
      message: "يجب تسجيل الدخول أولاً.",
    },
  });
});

test("parseJsonBody returns structured error on invalid JSON", async () => {
  const request = new Request("https://example.com/api/orders", {
    method: "POST",
    body: "{",
    headers: { "content-type": "application/json" },
  });

  const parsed = await parseJsonBody<{ orderId: string }>(request);
  assert.equal("error" in parsed, true);
});
