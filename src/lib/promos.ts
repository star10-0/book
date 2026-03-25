import { Prisma, PromoCodeAppliesTo, PromoCodeAudience, PromoCodeType } from "@prisma/client";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { calculateOrderTotals } from "@/lib/orders/create-order";
import { prisma } from "@/lib/prisma";

type PromoErrorCode =
  | "INVALID_CODE"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PENDING"
  | "PROMO_NOT_ACTIVE"
  | "PROMO_NOT_STARTED"
  | "PROMO_EXPIRED"
  | "PROMO_USAGE_LIMIT"
  | "PROMO_USER_LIMIT"
  | "PROMO_MINIMUM_NOT_MET"
  | "PROMO_AUDIENCE_RESTRICTED"
  | "PROMO_SCOPE_RESTRICTED"
  | "PROMO_CURRENCY_MISMATCH"
  | "PROMO_LOCKED_BY_PAYMENT_ATTEMPT"
  | "ORDER_NOT_FREE";

export class PromoError extends Error {
  constructor(
    public readonly code: PromoErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PromoError";
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function computeDiscountCents(input: { type: PromoCodeType; value: number | null; baseAmountCents: number }) {
  if (input.type === PromoCodeType.FREE) {
    return input.baseAmountCents;
  }

  if (input.type === PromoCodeType.PERCENT) {
    const percent = Math.max(0, Math.min(input.value ?? 0, 100));
    return Math.floor((input.baseAmountCents * percent) / 100);
  }

  return Math.max(0, input.value ?? 0);
}

function validatePromoForOrder(input: {
  promo: {
    id: string;
    code: string;
    type: PromoCodeType;
    value: number | null;
    currency: string | null;
    isActive: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
    maxTotalUses: number | null;
    maxUsesPerUser: number | null;
    minimumAmountCents: number | null;
    audience: PromoCodeAudience;
    appliesTo: PromoCodeAppliesTo;
    organizationId: string | null;
    creatorId: string | null;
  };
  order: {
    subtotalCents: number;
    currency: string;
    items: Array<{ offerType: "PURCHASE" | "RENTAL" }>;
  };
  user: {
    id: string;
    role: "USER" | "CREATOR" | "ADMIN";
    organizationId: string | null;
  };
  totalUses: number;
  userUses: number;
  now: Date;
}) {
  const { promo, order, user, now } = input;

  if (!promo.isActive) throw new PromoError("PROMO_NOT_ACTIVE", "رمز الخصم غير مفعل حالياً.");
  if (promo.startsAt && promo.startsAt > now) throw new PromoError("PROMO_NOT_STARTED", "رمز الخصم غير متاح بعد.");
  if (promo.expiresAt && promo.expiresAt < now) throw new PromoError("PROMO_EXPIRED", "انتهت صلاحية رمز الخصم.");
  if (promo.maxTotalUses !== null && input.totalUses >= promo.maxTotalUses) {
    throw new PromoError("PROMO_USAGE_LIMIT", "تم استهلاك هذا الرمز بالكامل.");
  }
  if (promo.maxUsesPerUser !== null && input.userUses >= promo.maxUsesPerUser) {
    throw new PromoError("PROMO_USER_LIMIT", "استهلكت الحد الأقصى لاستخدام هذا الرمز.");
  }

  if (promo.minimumAmountCents !== null && order.subtotalCents < promo.minimumAmountCents) {
    throw new PromoError("PROMO_MINIMUM_NOT_MET", "قيمة الطلب لا تحقق الحد الأدنى للخصم.");
  }

  if (promo.currency && promo.currency !== order.currency) {
    throw new PromoError("PROMO_CURRENCY_MISMATCH", "عملة الرمز لا تطابق عملة الطلب.");
  }

  if (promo.organizationId && promo.organizationId !== user.organizationId) {
    throw new PromoError("PROMO_AUDIENCE_RESTRICTED", "هذا الرمز مقيد بمؤسسة مختلفة.");
  }

  if (promo.audience === PromoCodeAudience.INSTITUTION && !user.organizationId) {
    throw new PromoError("PROMO_AUDIENCE_RESTRICTED", "هذا الرمز متاح فقط لأعضاء مؤسسة.");
  }

  if (promo.audience === PromoCodeAudience.CREATOR && user.role !== "CREATOR" && user.role !== "ADMIN") {
    throw new PromoError("PROMO_AUDIENCE_RESTRICTED", "هذا الرمز متاح لحسابات الكتّاب فقط.");
  }

  if (promo.creatorId && promo.creatorId !== user.id) {
    throw new PromoError("PROMO_AUDIENCE_RESTRICTED", "هذا الرمز مقيّد لكاتب محدد.");
  }

  if (promo.appliesTo === PromoCodeAppliesTo.PURCHASE && order.items.some((item) => item.offerType !== "PURCHASE")) {
    throw new PromoError("PROMO_SCOPE_RESTRICTED", "الرمز مخصص لطلبات الشراء فقط.");
  }

  if (promo.appliesTo === PromoCodeAppliesTo.RENTAL && order.items.some((item) => item.offerType !== "RENTAL")) {
    throw new PromoError("PROMO_SCOPE_RESTRICTED", "الرمز مخصص لطلبات الإيجار فقط.");
  }

  if (promo.appliesTo === PromoCodeAppliesTo.PUBLISHING_FEE) {
    throw new PromoError("PROMO_SCOPE_RESTRICTED", "هذا الرمز مخصص لرسوم النشر فقط.");
  }

  const discountCents = Math.min(order.subtotalCents, computeDiscountCents({ type: promo.type, value: promo.value, baseAmountCents: order.subtotalCents }));
  const totals = calculateOrderTotals({
    subtotalCents: order.subtotalCents,
    discountCents,
  });

  if (!totals) {
    throw new PromoError("PROMO_MINIMUM_NOT_MET", "تعذر احتساب قيمة الطلب بعد الخصم.");
  }

  return { discountCents: totals.discountCents, finalTotalCents: totals.totalCents };
}

export async function applyPromoCodeToOrder(input: { orderId: string; userId: string; code: string }) {
  const code = normalizeCode(input.code);
  if (!code) {
    throw new PromoError("INVALID_CODE", "الرجاء إدخال رمز خصم صحيح.");
  }

  return prisma.$transaction(async (tx) => {
    const [user, order, promo] = await Promise.all([
      tx.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true, organizationId: true } }),
      tx.order.findFirst({
        where: { id: input.orderId, userId: input.userId },
        include: { items: { select: { offerType: true } } },
      }),
      tx.promoCode.findUnique({
        where: { code },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          currency: true,
          isActive: true,
          startsAt: true,
          expiresAt: true,
          maxTotalUses: true,
          maxUsesPerUser: true,
          minimumAmountCents: true,
          audience: true,
          appliesTo: true,
          organizationId: true,
          creatorId: true,
        },
      }),
    ]);

    if (!user || !order) throw new PromoError("ORDER_NOT_FOUND", "الطلب غير موجود.");
    if (order.status !== "PENDING") throw new PromoError("ORDER_NOT_PENDING", "لا يمكن تعديل رمز خصم لطلب غير معلق.");
    if (!promo) throw new PromoError("INVALID_CODE", "رمز الخصم غير صحيح.");
    const activePaymentAttempt = await tx.paymentAttempt.findFirst({
      where: {
        orderId: order.id,
        userId: user.id,
        status: {
          in: ["SUBMITTED", "VERIFYING", "PAID"],
        },
      },
      select: { id: true, status: true },
    });

    if (activePaymentAttempt) {
      throw new PromoError(
        "PROMO_LOCKED_BY_PAYMENT_ATTEMPT",
        "لا يمكن تغيير رمز الخصم بعد بدء عملية الدفع. أنشئ طلباً جديداً إذا أردت تعديل السعر.",
      );
    }

    const [totalUses, userUses] = await Promise.all([
      tx.promoRedemption.count({ where: { promoCodeId: promo.id, status: { in: ["APPLIED", "REDEEMED"] } } }),
      tx.promoRedemption.count({ where: { promoCodeId: promo.id, userId: user.id, status: { in: ["APPLIED", "REDEEMED"] } } }),
    ]);

    const calculation = validatePromoForOrder({
      promo,
      order: { subtotalCents: order.subtotalCents, currency: order.currency, items: order.items },
      user,
      totalUses,
      userUses,
      now: new Date(),
    });

    await tx.promoRedemption.updateMany({
      where: { orderId: order.id, userId: user.id, status: "APPLIED", promoCodeId: { not: promo.id } },
      data: { status: "VOIDED" },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        promoCodeId: promo.id,
        discountCents: calculation.discountCents,
        totalCents: calculation.finalTotalCents,
      },
    });

    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: {
        amountCents: calculation.finalTotalCents,
        metadata: {
          promoCode: promo.code,
          discountCents: calculation.discountCents,
          discountedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    const redemption = await tx.promoRedemption.upsert({
      where: {
        promoCodeId_userId_orderId: {
          promoCodeId: promo.id,
          userId: user.id,
          orderId: order.id,
        },
      },
      update: {
        status: "APPLIED",
        discountCents: calculation.discountCents,
        originalTotalCents: order.subtotalCents,
        finalTotalCents: calculation.finalTotalCents,
      },
      create: {
        promoCodeId: promo.id,
        userId: user.id,
        orderId: order.id,
        discountCents: calculation.discountCents,
        originalTotalCents: order.subtotalCents,
        finalTotalCents: calculation.finalTotalCents,
        status: "APPLIED",
      },
    });

    return {
      code: promo.code,
      type: promo.type,
      discountCents: calculation.discountCents,
      finalTotalCents: calculation.finalTotalCents,
      redemptionId: redemption.id,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function markPromoRedemptionsRedeemed(
  tx: Prisma.TransactionClient,
  input: { orderId: string; paymentId?: string; at?: Date },
) {
  await tx.promoRedemption.updateMany({
    where: {
      orderId: input.orderId,
      status: "APPLIED",
    },
    data: {
      status: "REDEEMED",
      paymentId: input.paymentId,
      redeemedAt: input.at ?? new Date(),
    },
  });
}

export async function completeFreeOrderWithPromo(input: { orderId: string; userId: string }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, userId: input.userId } });
    if (!order) throw new PromoError("ORDER_NOT_FOUND", "الطلب غير موجود.");
    if (order.status !== "PENDING") return { alreadyCompleted: true, orderId: order.id };
    if (order.totalCents > 0) throw new PromoError("ORDER_NOT_FREE", "الطلب ليس مجانياً بالكامل.");

    const payment = await tx.payment.create({
      data: {
        userId: input.userId,
        orderId: order.id,
        provider: "MANUAL",
        status: "SUCCEEDED",
        amountCents: 0,
        currency: order.currency,
        paidAt: new Date(),
        metadata: {
          source: "promo-free-checkout",
          promoCodeId: order.promoCodeId,
          discountCents: order.discountCents,
          note: "Order completed internally without external payment.",
        } as Prisma.InputJsonValue,
      },
    });

    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        userId: input.userId,
        orderId: order.id,
        provider: "MANUAL",
        amountCents: 0,
        currency: order.currency,
        status: "PAID",
        verifiedAt: new Date(),
        requestPayload: { source: "promo-free-checkout" },
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", placedAt: new Date() },
    });

    await grantAccessForPaidOrder(tx, { orderId: order.id, userId: input.userId, grantedAt: new Date() });
    await markPromoRedemptionsRedeemed(tx, { orderId: order.id, paymentId: payment.id, at: new Date() });

    return { alreadyCompleted: false, orderId: order.id, paymentId: payment.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
