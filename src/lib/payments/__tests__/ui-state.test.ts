import assert from "node:assert/strict";
import test from "node:test";
import { mapAttemptStatusToUiStatus, toArabicPaymentFailureMessage } from "@/lib/payments/ui-state";

test("mapAttemptStatusToUiStatus maps payment attempt lifecycle for user-facing panel", () => {
  assert.equal(mapAttemptStatusToUiStatus(undefined), "idle");
  assert.equal(mapAttemptStatusToUiStatus("PENDING"), "pending");
  assert.equal(mapAttemptStatusToUiStatus("SUBMITTED"), "pending");
  assert.equal(mapAttemptStatusToUiStatus("VERIFYING"), "verifying");
  assert.equal(mapAttemptStatusToUiStatus("PAID"), "success");
  assert.equal(mapAttemptStatusToUiStatus("FAILED"), "failure");
});

test("toArabicPaymentFailureMessage keeps Arabic reasons and sanitizes opaque provider errors", () => {
  assert.equal(
    toArabicPaymentFailureMessage("فشل التحقق بسبب رقم عملية غير صحيح."),
    "فشل التحقق بسبب رقم عملية غير صحيح.",
  );
  assert.equal(
    toArabicPaymentFailureMessage("provider timeout after verify call"),
    "تعذر تأكيد الدفع لدى مزود الخدمة الآن. راجع البيانات ثم أعد المحاولة.",
  );
  assert.equal(
    toArabicPaymentFailureMessage(""),
    "تعذر تأكيد الدفع حاليًا. راجع رقم العملية وحاول مجددًا.",
  );
});
