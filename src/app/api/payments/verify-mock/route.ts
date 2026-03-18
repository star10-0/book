import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { verifyPaymentMock } from "@/lib/payments/payment-service";

interface VerifyMockRequestBody {
  attemptId?: string;
  mockOutcome?: "paid" | "failed";
}

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyMockRequestBody;

  if (!body.attemptId) {
    return NextResponse.json({ message: "معرف محاولة الدفع مطلوب." }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  try {
    const attempt = await verifyPaymentMock({
      attemptId: body.attemptId,
      userId: user.id,
      mockOutcome: body.mockOutcome,
    });

    return NextResponse.json({
      message: "تم تنفيذ التحقق التجريبي من الدفع.",
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

    if (error instanceof Error && error.message.startsWith("Invalid payment status transition")) {
      return NextResponse.json({ message: "حالة الدفع الحالية لا تسمح بالتحقق." }, { status: 409 });
    }

    throw error;
  }
}
