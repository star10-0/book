import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { logError, getClientIp, getRequestId } from "@/lib/observability/logger";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { submitPaymentProof } from "@/lib/payments/payment-service";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

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

  const rateLimit = enforceRateLimit({ key: `payments:proof:${clientIp}`, limit: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) {
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

    if (isPaymentError(error, PAYMENT_ERROR_CODES.missingProviderReference)) {
      return jsonNoStore({ message: "مرجع مزود الدفع غير متاح بعد. أعد إنشاء المحاولة." }, { status: 409 });
    }

    logError("Failed to submit payment proof", error, { route: "/api/payments/submit-proof", requestId, ip: clientIp, userId: user.id });
    return jsonError(API_ERROR_CODES.server_error, "تعذر إرسال إثبات الدفع حالياً. حاول لاحقاً.", 500);
  }
}
