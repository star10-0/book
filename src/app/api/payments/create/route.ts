import { PaymentProvider } from "@prisma/client";
import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { createPaymentForOrder } from "@/lib/payments/payment-service";
import { isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation } from "@/lib/security";

interface CreatePaymentRequestBody {
  orderId?: string;
  provider?: PaymentProvider;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const parsedBody = await parseJsonBody<CreatePaymentRequestBody>(request, { invalidMessage: "تعذر قراءة بيانات الدفع." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const orderId = body.orderId?.trim();
  const provider = body.provider;

  if (!orderId || !provider) {
    return jsonError(API_ERROR_CODES.invalid_request, "الطلب غير مكتمل.", 400);
  }

  if (!Object.values(PaymentProvider).includes(provider)) {
    return jsonError(API_ERROR_CODES.invalid_request, "مزود الدفع غير صالح.", 400);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  try {
    const result = await createPaymentForOrder({
      orderId,
      provider,
      userId: user.id,
    });

    return jsonNoStore(
      {
        message: result.reused ? "تم استرجاع محاولة دفع جارية." : "تم إنشاء محاولة الدفع.",
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          provider: result.payment.provider,
        },
        attempt: {
          id: result.attempt.id,
          status: result.attempt.status,
        },
        checkoutUrl: result.checkoutUrl,
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch (error) {
    if (isPaymentError(error, PAYMENT_ERROR_CODES.orderNotFound)) {
      return jsonNoStore({ message: "الطلب غير موجود." }, { status: 404 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.orderNotPayable)) {
      return jsonNoStore({ message: "لا يمكن دفع هذا الطلب حالياً." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("No payment gateway")) {
      return jsonNoStore({ message: "مزود الدفع غير مدعوم حالياً." }, { status: 400 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.duplicateProviderReference)) {
      return jsonNoStore({ message: "مرجع الدفع مستخدم مسبقاً، يرجى إعادة المحاولة." }, { status: 409 });
    }

    if (error instanceof GatewayConfigurationError) {
      return jsonNoStore({ message: "إعدادات مزود الدفع غير مكتملة على الخادم." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      return jsonNoStore({ message: "تعذر إنشاء عملية الدفع لدى مزود الخدمة حالياً." }, { status: 502 });
    }

    console.error("Failed to create payment", error);
    return jsonError(API_ERROR_CODES.server_error, "تعذر إنشاء محاولة الدفع حالياً. حاول لاحقاً.", 500);
  }
}
