import assert from "node:assert/strict";
import test from "node:test";
import { __paymentServiceInternals } from "@/lib/payments/payment-service";

test("detects not-found hints from Sham Cash failure reason", () => {
  const isNotFound = __paymentServiceInternals.isTransactionNotFoundInSelectedProvider(
    "Sham Cash did not find the submitted transaction reference.",
    "SHAM_CASH",
  );

  assert.equal(isNotFound, true);
});

test("detects not-found hints from Syriatel failure reason", () => {
  const isNotFound = __paymentServiceInternals.isTransactionNotFoundInSelectedProvider(
    "Transaction not found in Syriatel provider ledger.",
    "SYRIATEL_CASH",
  );

  assert.equal(isNotFound, true);
});

test("builds Arabic provider-mismatch guidance for Syriatel -> Sham case", () => {
  const message = __paymentServiceInternals.buildFinalFailureReason({
    attemptProvider: "SYRIATEL_CASH",
    mismatchDiagnostic: {
      code: "provider_mismatch_possible",
      selectedProvider: "SYRIATEL_CASH",
      suggestedProvider: "SHAM_CASH",
      txReference: "tx-1",
    },
  });

  assert.match(message ?? "", /Sham Cash/);
  assert.match(message ?? "", /لم يتم العثور/);
});

test("builds Arabic selected-provider not-found guidance when no mismatch is confirmed", () => {
  const message = __paymentServiceInternals.buildFinalFailureReason({
    attemptProvider: "SHAM_CASH",
    mismatchDiagnostic: {
      code: "tx_not_found_in_selected_provider",
      selectedProvider: "SHAM_CASH",
      txReference: "tx-2",
    },
  });

  assert.match(message ?? "", /Sham Cash/);
  assert.match(message ?? "", /تأكد من رقم العملية/);
});
