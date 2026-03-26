import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { extractShamCashProviderReference, verifyShamCashCallbackSignature } from "@/lib/payments/gateways/sham-cash-callback";

test("verifyShamCashCallbackSignature validates signed payload", () => {
  const body = JSON.stringify({ providerReference: "ref-1", status: "paid" });
  const secret = "whsec_test";
  const signature = createHmac("sha256", secret).update(body, "utf8").digest("hex");

  const isValid = verifyShamCashCallbackSignature({
    rawBody: body,
    signatureHeader: `sha256=${signature}`,
    webhookSecret: secret,
  });

  assert.equal(isValid, true);
});

test("extractShamCashProviderReference falls back to paymentReference", () => {
  const providerReference = extractShamCashProviderReference({ paymentReference: "fallback-ref" });
  assert.equal(providerReference, "fallback-ref");
});
