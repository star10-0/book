import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { verifyPayment } from "@/lib/payments/payment-service";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";

interface VerifyMockRequestBody {
  attemptId?: string;
}

export async function POST(request: Request) {
  let body: VerifyMockRequestBody;

  try {
    body = (await request.json()) as VerifyMockRequestBody;
  } catch {
    return NextResponse.json({ message: "تعذر قراءة بيانات التحقق." }, { status: 400 });
  }

  const attemptId = body.attemptId?.trim();

  if (!attemptId) {
    return NextResponse.json({ message: "معرف محاولة الدفع مطلوب." }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  try {
    const attempt = await verifyPayment({
      attemptId,
      userId: user.id,
    });

    return NextResponse.json({
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
      return NextResponse.json({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "MISSING_PROVIDER_REFERENCE") {
      return NextResponse.json({ message: "بيانات مزود الدفع غير مكتملة لهذه المحاولة." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("Invalid payment status transition")) {
      return NextResponse.json({ message: "حالة الدفع الحالية لا تسمح بالتحقق." }, { status: 409 });
    }

    if (error instanceof GatewayConfigurationError) {
      return NextResponse.json({ message: "إعدادات مزود الدفع غير مكتملة على الخادم." }, { status: 500 });
    }

    if (error instanceof GatewayRequestError) {
      return NextResponse.json({ message: "تعذر التحقق من الدفع عبر مزود الخدمة حالياً." }, { status: 502 });
    }

    console.error("Failed to verify payment", error);
    return NextResponse.json({ message: "تعذر التحقق من الدفع حالياً. حاول لاحقاً." }, { status: 500 });
  }
}
