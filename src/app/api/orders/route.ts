import { PaymentProvider } from "@prisma/client";
import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import {
  isOfferCurrentlyAvailable,
  mapOfferTypeToAccessGrantType,
  validateCreateOrderPayload,
} from "@/lib/orders/create-order";
import { prisma } from "@/lib/prisma";
import { isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const parsedBody = await parseJsonBody<unknown>(request, { invalidMessage: "تعذر قراءة بيانات الطلب." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const validation = validateCreateOrderPayload(body);

  if (validation.error || !validation.data) {
    return jsonNoStore({ message: validation.error ?? "بيانات الطلب غير صالحة." }, { status: 400 });
  }

  try {
    const now = new Date();

    const offer = await prisma.bookOffer.findFirst({
      where: {
        id: validation.data.offerId,
        bookId: validation.data.bookId,
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

    if (!offer || !isOfferCurrentlyAvailable(offer, now)) {
      return jsonNoStore({ message: "العرض المحدد غير متاح حالياً." }, { status: 404 });
    }

    const [activeGrant, existingPendingOrder] = await Promise.all([
      prisma.accessGrant.findFirst({
        where: {
          userId: user.id,
          bookId: offer.bookId,
          type: mapOfferTypeToAccessGrantType(offer.type),
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { id: true },
      }),
      prisma.order.findFirst({
        where: {
          userId: user.id,
          status: "PENDING",
          items: {
            some: {
              offerId: offer.id,
              bookId: offer.bookId,
            },
          },
        },
        select: { id: true },
      }),
    ]);

    if (activeGrant) {
      return jsonNoStore({ message: "تملك وصولاً نشطاً لهذا العرض بالفعل." }, { status: 409 });
    }

    if (existingPendingOrder) {
      return jsonNoStore(
        {
          message: "لديك طلب معلّق لهذا العرض مسبقاً.",
          order: { id: existingPendingOrder.id },
          checkoutUrl: `/checkout/${existingPendingOrder.id}`,
          summaryUrl: `/orders/${existingPendingOrder.id}/summary`,
        },
        { status: 200 },
      );
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

    return jsonNoStore(
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
        checkoutUrl: `/checkout/${created.order.id}`,
        summaryUrl: `/orders/${created.order.id}/summary`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create order", error);
    return jsonError(API_ERROR_CODES.server_error, "حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة لاحقاً.", 500);
  }
}
