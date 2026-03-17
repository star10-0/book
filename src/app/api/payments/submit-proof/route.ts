import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/auth-demo-user";
import { submitPaymentProof } from "@/lib/payments/payment-service";

interface SubmitPaymentProofRequestBody {
  attemptId?: string;
  transactionReference?: string;
  proofNote?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SubmitPaymentProofRequestBody;

  if (!body.attemptId || !body.transactionReference) {
    return NextResponse.json({ message: "بيانات إثبات الدفع غير مكتملة." }, { status: 400 });
  }

  const demoUser = await getOrCreateDemoUser();

  try {
    const attempt = await submitPaymentProof({
      attemptId: body.attemptId,
      userId: demoUser.id,
      transactionReference: body.transactionReference,
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
    if (error instanceof Error && error.message === "ATTEMPT_NOT_FOUND") {
      return NextResponse.json({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ATTEMPT_NOT_SUBMITTABLE") {
      return NextResponse.json({ message: "لا يمكن إرسال إثبات الدفع لهذه المحاولة حالياً." }, { status: 409 });
    }

    throw error;
  }
}
