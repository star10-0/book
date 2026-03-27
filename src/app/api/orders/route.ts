import { Prisma } from "@prisma/client";
import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { logError, logWarn, getClientIp, getRequestId } from "@/lib/observability/logger";
import {
  calculateOrderTotals,
  isOfferCurrentlyAvailable,
  mapOfferTypeToAccessGrantType,
  validateCreateOrderPayload,
} from "@/lib/orders/create-order";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimitUnavailable, rejectRateLimited } from "@/lib/security";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientIp = getClientIp(request);

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `orders:create:${clientIp}`, limit: 30, windowMs: 60_000, requireDistributedInProduction: true });
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "RATE_LIMIT_BACKEND_UNAVAILABLE" || rateLimit.reason === "RATE_LIMIT_ENV_MISCONFIG") {
      logWarn("Order rate limit unavailable", {
        route: "/api/orders",
        requestId,
        ip: clientIp,
        reason: rateLimit.reason,
        details: rateLimit.details,
        backend: rateLimit.backend,
      });
      return rejectRateLimitUnavailable(rateLimit.reason);
    }
    return rejectRateLimited(rateLimit.retryAfterSeconds);
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

  if (!validation.ok) {
    return jsonNoStore({ message: validation.error }, { status: 400 });
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

    if (offer.priceCents < 0) {
      return jsonNoStore({ message: "سعر العرض غير صالح حالياً. يرجى اختيار عرض آخر." }, { status: 409 });
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

    const totals = calculateOrderTotals({ subtotalCents: offer.priceCents });
    if (!totals) {
      return jsonNoStore({ message: "تعذر تسعير هذا العرض حالياً." }, { status: 409 });
    }

    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          currency: offer.currency,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
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

      return order;
    });

    return jsonNoStore(
      {
        message: "تم إنشاء الطلب بنجاح.",
        order: {
          id: createdOrder.id,
          status: createdOrder.status,
          totalCents: createdOrder.totalCents,
          currency: createdOrder.currency,
          items: createdOrder.items.map((item) => ({
            id: item.id,
            titleSnapshot: item.titleSnapshot,
            offerType: item.offerType,
            unitPriceCents: item.unitPriceCents,
            rentalDays: item.rentalDays,
          })),
        },
        checkoutUrl: `/checkout/${createdOrder.id}`,
        summaryUrl: `/orders/${createdOrder.id}/summary`,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003" || error.code === "P2004") {
        return jsonNoStore({ message: "تعذر إنشاء الطلب بسبب تعارض في بيانات العرض. أعد تحميل الصفحة وجرب مرة أخرى." }, { status: 409 });
      }

      if (error.code === "P2025") {
        return jsonNoStore({ message: "تعذر العثور على بيانات الطلب المطلوبة." }, { status: 404 });
      }
    }

    logError("Failed to create order", error, { route: "/api/orders", requestId, ip: clientIp, userId: user.id });
    return jsonError(API_ERROR_CODES.server_error, "حدث خطأ أثناء إنشاء الطلب. يرجى المحاولة لاحقاً.", 500);
  }
}
