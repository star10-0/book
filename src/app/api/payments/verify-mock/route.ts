import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { logError, getClientIp, getRequestId } from "@/lib/observability/logger";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { isMockPaymentVerificationEnabled } from "@/lib/payments/mock-mode";
import { verifyPayment } from "@/lib/payments/payment-service";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

interface VerifyMockRequestBody {
  attemptId?: string;
  mockOutcome?: "paid" | "failed";
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientIp = getClientIp(request);

  if (!isMockPaymentVerificationEnabled()) {
    return jsonNoStore({ message: "مسار التحقق التجريبي غير متاح في هذه البيئة." }, { status: 404 });
  }

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = enforceRateLimit({ key: `payments:verify-mock:${clientIp}`, limit: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const parsedBody = await parseJsonBody<VerifyMockRequestBody>(request, { invalidMessage: "تعذر قراءة بيانات التحقق." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const attemptId = body.attemptId?.trim();
  const mockOutcome = body.mockOutcome;

  if (!attemptId) {
    return jsonError(API_ERROR_CODES.invalid_request, "معرف محاولة الدفع مطلوب.", 400);
  }

  if (mockOutcome && mockOutcome !== "paid" && mockOutcome !== "failed") {
    return jsonError(API_ERROR_CODES.invalid_request, "نتيجة المحاكاة غير صالحة.", 400);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  try {
    const attempt = await verifyPayment({
      attemptId,
      userId: user.id,
      mockOutcome,
    });

    return jsonNoStore({
      message: "تم التحقق من حالة الدفع لدى مزود الخدمة.",
      attempt: {
        id: attempt.id,
        status: attempt.status,
        verifiedAt: attempt.verifiedAt,
        failureReason: attempt.failureReason,
      },
    });
  } catch (error) {
    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptNotFound)) {
      return jsonNoStore({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.missingProviderReference)) {
      return jsonNoStore({ message: "بيانات مزود الدفع غير مكتملة لهذه المحاولة." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("Invalid payment status transition")) {
      return jsonNoStore({ message: "حالة الدفع الحالية لا تسمح بالتحقق." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptAlreadyVerifying)) {
      return jsonNoStore({ message: "محاولة الدفع قيد التحقق حالياً. أعد المحاولة بعد لحظات." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.mockVerificationDisabled)) {
      return jsonNoStore({ message: "التحقق التجريبي غير مفعّل على الخادم." }, { status: 403 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.providerReferenceIntegrityMismatch)) {
      return jsonNoStore({ message: "مرجع مزود الدفع لا يطابق سجل العملية." }, { status: 409 });
    }

    if (error instanceof GatewayConfigurationError) {
      return jsonNoStore({ message: "إعدادات مزود الدفع غير مكتملة على الخادم." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      return jsonNoStore({ message: "تعذر التحقق من الدفع عبر مزود الخدمة حالياً." }, { status: 502 });
    }

    logError("Failed to verify payment", error, { route: "/api/payments/verify-mock", requestId, ip: clientIp, userId: user.id });
    return jsonError(API_ERROR_CODES.server_error, "تعذر التحقق من الدفع حالياً. حاول لاحقاً.", 500);
  }
}
