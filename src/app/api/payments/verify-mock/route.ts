import { NextResponse } from "next/server";
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

  try {
    const attempt = await verifyPaymentMock({
      attemptId: body.attemptId,
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
