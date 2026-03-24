import { getCurrentUser } from "@/lib/auth-session";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { isMockPaymentVerificationEnabled } from "@/lib/payments/mock-mode";
import { verifyPayment } from "@/lib/payments/payment-service";
import { isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation } from "@/lib/security";

interface VerifyMockRequestBody {
  attemptId?: string;
  mockOutcome?: "paid" | "failed";
}

export async function POST(request: Request) {
  if (!isMockPaymentVerificationEnabled()) {
    return jsonNoStore({ message: "مسار التحقق التجريبي غير متاح في هذه البيئة." }, { status: 404 });
  }

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  let body: VerifyMockRequestBody;

  try {
    body = (await request.json()) as VerifyMockRequestBody;
  } catch {
    return jsonNoStore({ message: "تعذر قراءة بيانات التحقق." }, { status: 400 });
  }

  const attemptId = body.attemptId?.trim();
  const mockOutcome = body.mockOutcome;

  if (!attemptId) {
    return jsonNoStore({ message: "معرف محاولة الدفع مطلوب." }, { status: 400 });
  }

  if (mockOutcome && mockOutcome !== "paid" && mockOutcome !== "failed") {
    return jsonNoStore({ message: "نتيجة المحاكاة غير صالحة." }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonNoStore({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
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
    if (error instanceof Error && error.message === "ATTEMPT_NOT_FOUND") {
      return jsonNoStore({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "MISSING_PROVIDER_REFERENCE") {
      return jsonNoStore({ message: "بيانات مزود الدفع غير مكتملة لهذه المحاولة." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("Invalid payment status transition")) {
      return jsonNoStore({ message: "حالة الدفع الحالية لا تسمح بالتحقق." }, { status: 409 });
    }

    if (error instanceof Error && error.message === "ATTEMPT_ALREADY_VERIFYING") {
      return jsonNoStore({ message: "محاولة الدفع قيد التحقق حالياً. أعد المحاولة بعد لحظات." }, { status: 409 });
    }

    if (error instanceof Error && error.message === "MOCK_VERIFICATION_DISABLED") {
      return jsonNoStore({ message: "التحقق التجريبي غير مفعّل على الخادم." }, { status: 403 });
    }

    if (error instanceof GatewayConfigurationError) {
      return jsonNoStore({ message: "إعدادات مزود الدفع غير مكتملة على الخادم." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      return jsonNoStore({ message: "تعذر التحقق من الدفع عبر مزود الخدمة حالياً." }, { status: 502 });
    }

    console.error("Failed to verify payment", error);
    return jsonNoStore({ message: "تعذر التحقق من الدفع حالياً. حاول لاحقاً." }, { status: 500 });
  }
}
