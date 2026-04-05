import { GatewayRequestError } from "@/lib/payments/gateways/provider-http";

export function getVerifyGatewayErrorMessage(error: GatewayRequestError): string {
  if (isAmountIntegrityMismatch(error.message)) {
    return "تعذر تأكيد الدفع: قيمة الحوالة لا تطابق القيمة المطلوبة. يرجى التحقق من المبلغ ثم إعادة المحاولة.";
  }

  if (isTransactionNotFoundMessage(error.message)) {
    return "لم يتم العثور على رقم العملية لدى مزود الدفع المحدد. تأكد من رقم العملية ووسيلة الدفع المختارة ثم أعد المحاولة.";
  }

  if (isProviderMismatchMessage(error.message)) {
    return "رقم العملية لا يطابق مزود الدفع المحدد. اختر نفس المزود الذي أُجري عبره التحويل ثم أعد التحقق.";
  }

  if (isProviderAuthenticationIssue(error)) {
    return "تعذر التواصل مع مزود الدفع بسبب مشكلة مصادقة أو صلاحيات. يرجى المحاولة لاحقًا أو التواصل مع الدعم.";
  }

  if (isTemporaryProviderFailure(error)) {
    return "خدمة مزود الدفع غير مستقرة حالياً. يرجى الانتظار قليلًا ثم إعادة المحاولة.";
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

function isTransactionNotFoundMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("did not find")
    || normalizedMessage.includes("not found")
    || normalizedMessage.includes("submitted transaction reference");
}

function isProviderMismatchMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("destination account mismatch")
    || normalizedMessage.includes("currency does not match expected currency")
    || normalizedMessage.includes("provider reference does not match");
}

function isProviderAuthenticationIssue(error: GatewayRequestError): boolean {
  if (error.statusCode === 401 || error.statusCode === 403) {
    return true;
  }

  const normalizedMessage = error.message.toLowerCase();
  return normalizedMessage.includes("unauthorized")
    || normalizedMessage.includes("forbidden")
    || normalizedMessage.includes("invalid api key")
    || normalizedMessage.includes("authentication")
    || normalizedMessage.includes("authorization");
}

function isTemporaryProviderFailure(error: GatewayRequestError): boolean {
  if (error.statusCode === 429 || (typeof error.statusCode === "number" && error.statusCode >= 500)) {
    return true;
  }

  const normalizedMessage = error.message.toLowerCase();
  return normalizedMessage.includes("timed out")
    || normalizedMessage.includes("temporarily")
    || normalizedMessage.includes("unexpectedly")
    || normalizedMessage.includes("unavailable");
}
