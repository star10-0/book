import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { extractShamCashProviderReference, verifyShamCashCallbackSignature } from "@/lib/payments/gateways/sham-cash-callback";

test("verifyShamCashCallbackSignature validates signed payload with timestamp", () => {
  const body = JSON.stringify({ providerReference: "ref-1", status: "paid" });
  const secret = "whsec_test";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");

  const isValid = verifyShamCashCallbackSignature({
    rawBody: body,
    signatureHeader: `sha256=${signature}`,
    timestampHeader: timestamp,
    webhookSecret: secret,
  });

  assert.equal(isValid, true);
});

test("verifyShamCashCallbackSignature rejects stale timestamp", () => {
  const body = JSON.stringify({ providerReference: "ref-1", status: "paid" });
  const secret = "whsec_test";
  const timestamp = Math.floor((Date.now() - 10 * 60_000) / 1000).toString();
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");

  const isValid = verifyShamCashCallbackSignature({
    rawBody: body,
    signatureHeader: `sha256=${signature}`,
    timestampHeader: timestamp,
    webhookSecret: secret,
  });

  assert.equal(isValid, false);
});

test("extractShamCashProviderReference falls back to paymentReference", () => {
  const providerReference = extractShamCashProviderReference({ paymentReference: "fallback-ref" });
  assert.equal(providerReference, "fallback-ref");
});
