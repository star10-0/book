import { PaymentProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/auth-demo-user";
import { createPaymentForOrder } from "@/lib/payments/payment-service";

interface CreatePaymentRequestBody {
  orderId?: string;
  provider?: PaymentProvider;
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreatePaymentRequestBody;

  if (!body.orderId || !body.provider) {
    return NextResponse.json({ message: "الطلب غير مكتمل." }, { status: 400 });
  }

  const demoUser = await getOrCreateDemoUser();

  try {
    const result = await createPaymentForOrder({
      orderId: body.orderId,
      provider: body.provider,
      userId: demoUser.id,
    });

    return NextResponse.json(
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
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "ORDER_NOT_PAYABLE") {
      return NextResponse.json({ message: "لا يمكن دفع هذا الطلب حالياً." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("No payment gateway")) {
      return NextResponse.json({ message: "مزود الدفع غير مدعوم حالياً." }, { status: 400 });
    }

    throw error;
  }
}
