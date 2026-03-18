import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { submitPaymentProof } from "@/lib/payments/payment-service";

interface SubmitPaymentProofRequestBody {
  attemptId?: string;
  transactionReference?: string;
  proofNote?: string;
}

export async function POST(request: Request) {
  let body: SubmitPaymentProofRequestBody;

  try {
    body = (await request.json()) as SubmitPaymentProofRequestBody;
  } catch {
    return NextResponse.json({ message: "تعذر قراءة بيانات إثبات الدفع." }, { status: 400 });
  }

  const attemptId = body.attemptId?.trim();
  const transactionReference = body.transactionReference?.trim();

  if (!attemptId || !transactionReference) {
    return NextResponse.json({ message: "بيانات إثبات الدفع غير مكتملة." }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  try {
    const attempt = await submitPaymentProof({
      attemptId,
      userId: user.id,
      transactionReference,
      proofNote: body.proofNote,
    });

    return NextResponse.json({
      message: "تم إرسال مرجع الدفع بنجاح.",
      attempt: {
        id: attempt.id,
        status: attempt.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PAYMENT_PROOF_INPUT") {
      return NextResponse.json({ message: "بيانات إثبات الدفع غير صالحة." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "ATTEMPT_NOT_FOUND") {
      return NextResponse.json({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ATTEMPT_NOT_SUBMITTABLE") {
      return NextResponse.json({ message: "لا يمكن إرسال إثبات الدفع لهذه المحاولة حالياً." }, { status: 409 });
    }

    console.error("Failed to submit payment proof", error);
    return NextResponse.json({ message: "تعذر إرسال إثبات الدفع حالياً. حاول لاحقاً." }, { status: 500 });
  }
}
