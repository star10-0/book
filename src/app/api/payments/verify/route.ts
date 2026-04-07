import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { logError, getClientIp, getRequestId } from "@/lib/observability/logger";
import { recordApiResponse, recordPaymentEvent } from "@/lib/observability/metrics";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { resolveAttemptIdFromOperationNumber } from "@/lib/payments/public-operation-number";
import { verifyPayment } from "@/lib/payments/payment-service";
import { getVerifyGatewayErrorMessage } from "@/lib/payments/verify-diagnostics";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimitUnavailable, rejectRateLimited } from "@/lib/security";

interface VerifyPaymentRequestBody {
  operationNumber?: string;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientIp = getClientIp(request);

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `payments:verify:${clientIp}`, limit: 30, windowMs: 60_000, requireDistributedInProduction: true });
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "RATE_LIMIT_BACKEND_UNAVAILABLE" || rateLimit.reason === "RATE_LIMIT_ENV_MISCONFIG") {
      return rejectRateLimitUnavailable(rateLimit.reason);
    }
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const parsedBody = await parseJsonBody<VerifyPaymentRequestBody>(request, { invalidMessage: "تعذر قراءة بيانات التحقق." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const operationNumber = body.operationNumber?.trim();

  if (!operationNumber) {
    return jsonError(API_ERROR_CODES.invalid_request, "رقم العملية العام مطلوب.", 400);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const attemptId = await resolveAttemptIdFromOperationNumber({ userId: user.id, operationNumber });
  if (!attemptId) {
    return jsonNoStore({ message: "رقم العملية العام غير صالح." }, { status: 404 });
  }

  try {
    const attempt = await verifyPayment({
      attemptId,
      userId: user.id,
    });
    recordApiResponse({ route: "/api/payments/verify", status: 200 });
    recordPaymentEvent({ flow: "verify", outcome: "success", reason: "verified" });

    return jsonNoStore({
      message: "تم التحقق من حالة الدفع لدى مزود الخدمة.",
      attempt: {
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

    if (isPaymentError(error, PAYMENT_ERROR_CODES.orderNotPayable)) {
      return jsonNoStore({ message: "لا يمكن التحقق من هذه المحاولة لأن الطلب لم يعد قابلاً للدفع." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.providerReferenceIntegrityMismatch)) {
      return jsonNoStore({ message: "مرجع مزود الدفع لا يطابق سجل العملية." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.transactionReferenceAlreadyPaidElsewhere)) {
      return jsonNoStore({ message: "رقم العملية مرتبط بالفعل بدفعة ناجحة لطلب آخر." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.transactionReferenceCurrentlyVerifying)) {
      return jsonNoStore({ message: "رقم العملية قيد التحقق حالياً في محاولة أخرى." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.duplicateTransactionReference)) {
      return jsonNoStore({ message: "تم اكتشاف تعارض في رقم العملية." }, { status: 409 });
    }

    if (error instanceof GatewayConfigurationError) {
      recordApiResponse({ route: "/api/payments/verify", status: 500 });
      recordPaymentEvent({ flow: "verify", outcome: "failure", reason: "provider_env_missing" });
      return jsonNoStore({ message: "إعدادات مزود الدفع غير مكتملة على الخادم." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      const status = typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 502;
      recordApiResponse({ route: "/api/payments/verify", status });
      recordPaymentEvent({ flow: "verify", outcome: "failure", reason: "gateway_request_failed" });
      return jsonNoStore({ message: getVerifyGatewayErrorMessage(error) }, { status });
    }

    recordApiResponse({ route: "/api/payments/verify", status: 500 });
    recordPaymentEvent({ flow: "verify", outcome: "failure", reason: "internal_error" });
    logError("Failed to verify payment", error, { route: "/api/payments/verify", requestId, ip: clientIp, userId: user.id });
    return jsonError(API_ERROR_CODES.server_error, "تعذر التحقق من الدفع حالياً. حاول لاحقاً.", 500);
  }
}
