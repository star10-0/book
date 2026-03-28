import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { logError, getClientIp, getRequestId } from "@/lib/observability/logger";
import { recordApiResponse, recordPaymentEvent } from "@/lib/observability/metrics";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { submitPaymentProof } from "@/lib/payments/payment-service";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimitUnavailable, rejectRateLimited } from "@/lib/security";

interface SubmitPaymentProofRequestBody {
  attemptId?: string;
  transactionReference?: string;
  proofNote?: string;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientIp = getClientIp(request);

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `payments:proof:${clientIp}`, limit: 20, windowMs: 60_000, requireDistributedInProduction: true });
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "RATE_LIMIT_BACKEND_UNAVAILABLE") {
      return rejectRateLimitUnavailable();
    }
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const parsedBody = await parseJsonBody<SubmitPaymentProofRequestBody>(request, { invalidMessage: "تعذر قراءة بيانات إثبات الدفع." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const attemptId = body.attemptId?.trim();
  const transactionReference = body.transactionReference?.trim();

  if (!attemptId || !transactionReference) {
    return jsonError(API_ERROR_CODES.invalid_request, "بيانات إثبات الدفع غير مكتملة.", 400);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  try {
    const attempt = await submitPaymentProof({
      attemptId,
      userId: user.id,
      transactionReference,
      proofNote: body.proofNote,
    });
    recordApiResponse({ route: "/api/payments/submit-proof", status: 200 });
    recordPaymentEvent({ flow: "submit_proof", outcome: "success", reason: "submitted" });

    return jsonNoStore({
      message: "تم إرسال مرجع الدفع بنجاح.",
      attempt: {
        id: attempt.id,
        status: attempt.status,
      },
    });
  } catch (error) {
    if (isPaymentError(error, PAYMENT_ERROR_CODES.invalidPaymentProofInput)) {
      return jsonNoStore({ message: "بيانات إثبات الدفع غير صالحة." }, { status: 400 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptNotFound)) {
      return jsonNoStore({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptNotSubmittable)) {
      return jsonNoStore({ message: "لا يمكن إرسال إثبات الدفع لهذه المحاولة حالياً." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.paymentProofImmutable)) {
      return jsonNoStore({ message: "تم تثبيت مرجع الدفع لهذه المحاولة مسبقًا ولا يمكن تعديله." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.duplicateTransactionReference)) {
      return jsonNoStore({ message: "رقم العملية مستخدم مسبقاً في محاولة دفع أخرى." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.missingProviderReference)) {
      return jsonNoStore({ message: "مرجع مزود الدفع غير متاح بعد. أعد إنشاء المحاولة." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.zeroAmountOrder)) {
      return jsonNoStore({ message: "هذا الطلب مجاني بالكامل ولا يتطلب إرسال إثبات دفع." }, { status: 409 });
    }

    recordApiResponse({ route: "/api/payments/submit-proof", status: 500 });
    recordPaymentEvent({ flow: "submit_proof", outcome: "failure", reason: "internal_error" });
    logError("Failed to submit payment proof", error, { route: "/api/payments/submit-proof", requestId, ip: clientIp, userId: user.id });
    return jsonError(API_ERROR_CODES.server_error, "تعذر إرسال إثبات الدفع حالياً. حاول لاحقاً.", 500);
  }
}
