import { getCurrentUser } from "@/lib/auth-session";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { submitPaymentProof } from "@/lib/payments/payment-service";
import { isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation } from "@/lib/security";

interface SubmitPaymentProofRequestBody {
  attemptId?: string;
  transactionReference?: string;
  proofNote?: string;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  let body: SubmitPaymentProofRequestBody;

  try {
    body = (await request.json()) as SubmitPaymentProofRequestBody;
  } catch {
    return jsonNoStore({ message: "تعذر قراءة بيانات إثبات الدفع." }, { status: 400 });
  }

  const attemptId = body.attemptId?.trim();
  const transactionReference = body.transactionReference?.trim();

  if (!attemptId || !transactionReference) {
    return jsonNoStore({ message: "بيانات إثبات الدفع غير مكتملة." }, { status: 400 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonNoStore({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  try {
    const attempt = await submitPaymentProof({
      attemptId,
      userId: user.id,
      transactionReference,
      proofNote: body.proofNote,
    });

    return jsonNoStore({
      message: "تم إرسال مرجع الدفع بنجاح.",
      attempt: {
        id: attempt.id,
        status: attempt.status,
      },
    });
  } catch (error) {
    if (isPaymentError(error, PAYMENT_ERROR_CODES.invalidPaymentProofInput)) {
      return jsonNoStore({ message: "بيانات إثبات الدفع غير صالحة." }, { status: 400 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptNotFound)) {
      return jsonNoStore({ message: "محاولة الدفع غير موجودة." }, { status: 404 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.attemptNotSubmittable)) {
      return jsonNoStore({ message: "لا يمكن إرسال إثبات الدفع لهذه المحاولة حالياً." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.missingProviderReference)) {
      return jsonNoStore({ message: "مرجع مزود الدفع غير متاح بعد. أعد إنشاء المحاولة." }, { status: 409 });
    }

    console.error("Failed to submit payment proof", error);
    return jsonNoStore({ message: "تعذر إرسال إثبات الدفع حالياً. حاول لاحقاً." }, { status: 500 });
  }
}
