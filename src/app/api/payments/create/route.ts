import { PaymentProvider } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
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

  let body: CreatePaymentRequestBody;

  try {
    body = (await request.json()) as CreatePaymentRequestBody;
  } catch {
    return jsonNoStore({ message: "تعذر قراءة بيانات الدفع." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const provider = body.provider;

  if (!orderId || !provider) {
    return jsonNoStore({ message: "الطلب غير مكتمل." }, { status: 400 });
  }

  if (!Object.values(PaymentProvider).includes(provider)) {
    return jsonNoStore({ message: "مزود الدفع غير صالح." }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonNoStore({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  try {
    const result = await createPaymentForOrder({
      orderId,
      provider,
      userId: user.id,
    });

    return jsonNoStore(
      {
        message: "تم إنشاء محاولة الدفع.",
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          provider: result.payment.provider,
          providerRef: result.attempt.providerReference,
        },
        attempt: {
          id: result.attempt.id,
          status: result.attempt.status,
        },
        checkoutUrl: result.checkoutUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return jsonNoStore({ message: "الطلب غير موجود." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ORDER_NOT_PAYABLE") {
      return jsonNoStore({ message: "لا يمكن دفع هذا الطلب حالياً." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("No payment gateway")) {
      return jsonNoStore({ message: "مزود الدفع غير مدعوم حالياً." }, { status: 400 });
    }

    if (error instanceof GatewayConfigurationError) {
      return jsonNoStore({ message: "إعدادات مزود الدفع غير مكتملة على الخادم." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      return jsonNoStore({ message: "تعذر إنشاء عملية الدفع لدى مزود الخدمة حالياً." }, { status: 502 });
    }

    console.error("Failed to create payment", error);
    return jsonNoStore({ message: "تعذر إنشاء محاولة الدفع حالياً. حاول لاحقاً." }, { status: 500 });
  }
}
