import assert from "node:assert/strict";
import test from "node:test";
import { GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { getVerifyGatewayErrorMessage } from "@/lib/payments/verify-diagnostics";

test("getVerifyGatewayErrorMessage returns raw gateway error message in development", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "development";

  const message = getVerifyGatewayErrorMessage(new GatewayRequestError({
    provider: "sham_cash",
    phase: "verify",
    message: "Provider API request failed with status 401.",
  }));

  assert.equal(message, "Provider API request failed with status 401.");

  if (typeof originalNodeEnv === "string") {
    env.NODE_ENV = originalNodeEnv;
  } else {
    delete env.NODE_ENV;
  }
});

test("getVerifyGatewayErrorMessage keeps user-friendly message outside development", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";

  const message = getVerifyGatewayErrorMessage(new GatewayRequestError({
    provider: "sham_cash",
    phase: "verify",
    message: "sensitive provider diagnostics",
  }));

  assert.equal(message, "تعذر التحقق من الدفع عبر مزود الخدمة حالياً.");

  if (typeof originalNodeEnv === "string") {
    env.NODE_ENV = originalNodeEnv;
  } else {
    delete env.NODE_ENV;
  }
});

test("getVerifyGatewayErrorMessage returns a clear message for amount mismatch integrity failures", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";

  const message = getVerifyGatewayErrorMessage(new GatewayRequestError({
    provider: "syriatel_cash",
    phase: "verify",
    statusCode: 409,
    message: "قيمة عملية Syriatel Cash لا تطابق المبلغ المتوقع. (Syriatel Cash verify amount mismatch.)",
  }));

  assert.equal(
    message,
    "تعذر تأكيد الدفع: قيمة الحوالة لا تطابق القيمة المطلوبة. يرجى التحقق من المبلغ ثم إعادة المحاولة.",
  );

  if (typeof originalNodeEnv === "string") {
    env.NODE_ENV = originalNodeEnv;
  } else {
    delete env.NODE_ENV;
  }
});
