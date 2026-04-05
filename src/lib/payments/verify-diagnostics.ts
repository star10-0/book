import { GatewayRequestError } from "@/lib/payments/gateways/provider-http";

export function getVerifyGatewayErrorMessage(error: GatewayRequestError): string {
  if (isAmountIntegrityMismatch(error.message)) {
    return "تعذر تأكيد الدفع: قيمة الحوالة لا تطابق القيمة المطلوبة. يرجى التحقق من المبلغ ثم إعادة المحاولة.";
  }

  if (process.env.NODE_ENV === "development") {
    return error.message;
  }

  return "تعذر التحقق من الدفع عبر مزود الخدمة حالياً.";
}

function isAmountIntegrityMismatch(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("amount mismatch")
    || normalizedMessage.includes("amount does not match expected amount")
    || normalizedMessage.includes("لا تطابق المبلغ المتوقع");
}
