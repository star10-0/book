import { PaymentProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type CreateOrderRequest = {
  bookId: string;
  offerId: string;
};

function validateCreateOrderPayload(payload: unknown): { data?: CreateOrderRequest; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "بيانات الطلب غير صالحة." };
  }

  const { bookId, offerId } = payload as Record<string, unknown>;

  if (typeof bookId !== "string" || bookId.trim().length === 0) {
    return { error: "حقل bookId مطلوب." };
  }

  if (typeof offerId !== "string" || offerId.trim().length === 0) {
    return { error: "حقل offerId مطلوب." };
  }

  return {
    data: {
      bookId: bookId.trim(),
      offerId: offerId.trim(),
    },
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "تعذر قراءة بيانات الطلب." }, { status: 400 });
  }

  const validation = validateCreateOrderPayload(body);

  if (validation.error || !validation.data) {
    return NextResponse.json({ message: validation.error ?? "بيانات الطلب غير صالحة." }, { status: 400 });
  }

  const now = new Date();

  const offer = await prisma.bookOffer.findFirst({
    where: {
      id: validation.data.offerId,
      bookId: validation.data.bookId,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: {
      book: {
        select: {
          id: true,
          titleAr: true,
          status: true,
          format: true,
        },
      },
    },
  });

  if (!offer || offer.book.status !== "PUBLISHED" || offer.book.format !== "DIGITAL") {
    return NextResponse.json({ message: "العرض المحدد غير متاح حالياً." }, { status: 404 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: user.id,
        currency: offer.currency,
        subtotalCents: offer.priceCents,
        totalCents: offer.priceCents,
        items: {
          create: {
            bookId: offer.bookId,
            offerId: offer.id,
            titleSnapshot: offer.book.titleAr,
            offerType: offer.type,
            unitPriceCents: offer.priceCents,
            quantity: 1,
            rentalDays: offer.rentalDays,
          },
        },
      },
      include: {
        items: true,
      },
    });

    const payment = await tx.payment.create({
      data: {
        userId: user.id,
        orderId: order.id,
        provider: PaymentProvider.MANUAL,
        amountCents: order.totalCents,
        currency: order.currency,
        metadata: {
          source: "authenticated-checkout",
          note: "TODO(payment): replace MANUAL stub with real provider session creation.",
        },
      },
    });

    return { order, payment };
  });

  return NextResponse.json(
    {
      message: "تم إنشاء الطلب بنجاح.",
      order: {
        id: created.order.id,
        status: created.order.status,
        totalCents: created.order.totalCents,
        currency: created.order.currency,
        items: created.order.items.map((item) => ({
          id: item.id,
          titleSnapshot: item.titleSnapshot,
          offerType: item.offerType,
          unitPriceCents: item.unitPriceCents,
          rentalDays: item.rentalDays,
        })),
      },
      payment: {
        id: created.payment.id,
        status: created.payment.status,
        provider: created.payment.provider,
      },
    },
    { status: 201 },
  );
}
