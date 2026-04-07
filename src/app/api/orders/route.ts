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
import { generatePublicOrderNumber } from "@/lib/public-reference";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimitUnavailable, rejectRateLimited } from "@/lib/security";
import { buildPendingOrderAdvisoryLockKeys } from "@/lib/orders/pending-order-lock";

async function lockPendingOrderSlot(tx: Prisma.TransactionClient, input: { userId: string; offerId: string }) {
  const [keyA, keyB] = buildPendingOrderAdvisoryLockKeys(input);

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(${keyA}::int4, ${keyB}::int4);
  `;
}

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

    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.bookOffer.findFirst({
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
        return { type: "OFFER_UNAVAILABLE" as const };
      }

      if (offer.priceCents < 0) {
        return { type: "INVALID_OFFER_PRICE" as const };
      }

      await lockPendingOrderSlot(tx, { userId: user.id, offerId: offer.id });

      const [activeGrant, existingPendingOrder] = await Promise.all([
        tx.accessGrant.findFirst({
          where: {
            userId: user.id,
            bookId: offer.bookId,
            type: mapOfferTypeToAccessGrantType(offer.type),
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: { id: true },
        }),
        tx.order.findFirst({
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
          select: {
            id: true,
            publicOrderNumber: true,
          },
        }),
      ]);

      if (activeGrant) {
        return { type: "ALREADY_GRANTED" as const };
      }

      if (existingPendingOrder) {
        return {
          type: "PENDING_EXISTS" as const,
          orderId: existingPendingOrder.id,
          publicOrderNumber: existingPendingOrder.publicOrderNumber,
        };
      }

      const totals = calculateOrderTotals({ subtotalCents: offer.priceCents });
      if (!totals) {
        return { type: "PRICING_UNAVAILABLE" as const };
      }

      const publicOrderNumber = await generatePublicOrderNumber(tx, now);

      const order = await tx.order.create({
        data: {
          userId: user.id,
          currency: offer.currency,
          publicOrderNumber,
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

      return { type: "CREATED" as const, order };
    });

    if (result.type === "OFFER_UNAVAILABLE") {
      return jsonNoStore({ message: "العرض المحدد غير متاح حالياً." }, { status: 404 });
    }

    if (result.type === "INVALID_OFFER_PRICE") {
      return jsonNoStore({ message: "سعر العرض غير صالح حالياً. يرجى اختيار عرض آخر." }, { status: 409 });
    }

    if (result.type === "ALREADY_GRANTED") {
      return jsonNoStore({ message: "تملك وصولاً نشطاً لهذا العرض بالفعل." }, { status: 409 });
    }

    if (result.type === "PENDING_EXISTS") {
      return jsonNoStore(
        {
          message: "لديك طلب معلّق لهذا العرض مسبقاً.",
          order: {
            id: result.orderId,
            publicOrderNumber: result.publicOrderNumber,
          },
          checkoutUrl: `/checkout/${result.orderId}`,
          summaryUrl: `/orders/${result.orderId}/summary`,
        },
        { status: 200 },
      );
    }

    if (result.type === "PRICING_UNAVAILABLE") {
      return jsonNoStore({ message: "تعذر تسعير هذا العرض حالياً." }, { status: 409 });
    }

    return jsonNoStore(
      {
        message: "تم إنشاء الطلب بنجاح.",
        order: {
          id: result.order.id,
          publicOrderNumber: result.order.publicOrderNumber,
          status: result.order.status,
          totalCents: result.order.totalCents,
          currency: result.order.currency,
          items: result.order.items.map((item) => ({
            id: item.id,
            titleSnapshot: item.titleSnapshot,
            offerType: item.offerType,
            unitPriceCents: item.unitPriceCents,
            rentalDays: item.rentalDays,
          })),
        },
        checkoutUrl: `/checkout/${result.order.id}`,
        summaryUrl: `/orders/${result.order.id}/summary`,
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
