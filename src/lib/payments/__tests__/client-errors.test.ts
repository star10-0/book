import assert from "node:assert/strict";
import test from "node:test";
import { buildPaymentClientConfigError } from "@/lib/payments/client-errors";

test("buildPaymentClientConfigError keeps client payload minimal", () => {
  const payload = buildPaymentClientConfigError({
    code: "PAYMENT_CONFIGURATION_INVALID",
    message: "إعدادات الدفع على الخادم غير صالحة حالياً.",
  });

  assert.deepEqual(payload, {
    message: "إعدادات الدفع على الخادم غير صالحة حالياً.",
    error: { code: "PAYMENT_CONFIGURATION_INVALID" },
  });
  assert.equal("missingEnvKeys" in (payload.error as Record<string, unknown>), false);
  assert.equal("selectedLiveProviders" in (payload.error as Record<string, unknown>), false);
});
