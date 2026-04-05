import { type PaymentAttemptStatus } from "@prisma/client";

export type PaymentUiStatus = "idle" | "pending" | "verifying" | "success" | "failure";

export function mapAttemptStatusToUiStatus(status?: PaymentAttemptStatus): PaymentUiStatus {
  if (!status) return "idle";
  if (status === "PAID") return "success";
  if (status === "FAILED") return "failure";
  if (status === "VERIFYING") return "verifying";
  if (status === "SUBMITTED" || status === "PENDING") return "pending";
  return "idle";
}

export function toArabicPaymentFailureMessage(reason?: string | null): string {
  if (!reason) return "تعذر تأكيد الدفع حاليًا. راجع رقم العملية وحاول مجددًا.";

  const normalized = reason.trim();
  const hasArabicCharacters = /[\u0600-\u06FF]/.test(normalized);
  if (hasArabicCharacters) {
    return normalized;
  }

  return "تعذر تأكيد الدفع لدى مزود الخدمة الآن. راجع البيانات ثم أعد المحاولة.";
}
