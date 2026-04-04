import { AccessGrantStatus, AccessGrantType, OrderStatus, PaymentStatus, PromoRedemptionStatus, Prisma } from "@prisma/client";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { prisma } from "@/lib/prisma";

export type IntegrityAnomalyKind =
  | "paid_order_missing_grants"
  | "grant_without_paid_flow"
  | "promo_redemption_mismatch"
  | "stale_rental_grant"
  | "payment_order_grant_state_mismatch";

export type OrderIntegrityAnomaly = {
  kind: IntegrityAnomalyKind;
  orderId: string;
  userId: string;
  details: string;
};

export type OrderIntegritySnapshot = {
  totals: Record<IntegrityAnomalyKind, number>;
  anomalies: OrderIntegrityAnomaly[];
};


export function isPaidOrderMissingGrant(input: {
  orderStatus: OrderStatus;
  hasItems: boolean;
  activeGrantCount: number;
}) {
  return input.orderStatus === OrderStatus.PAID && input.hasItems && input.activeGrantCount === 0;
}

export function isEligibleForGrantRecovery(input: {
  orderStatus: OrderStatus;
  totalCents: number;
  succeededPayments: number;
}) {
  if (input.orderStatus !== OrderStatus.PAID) return false;
  if (input.totalCents === 0) return true;
  return input.succeededPayments > 0;
}

const defaultTotals: Record<IntegrityAnomalyKind, number> = {
  paid_order_missing_grants: 0,
  grant_without_paid_flow: 0,
  promo_redemption_mismatch: 0,
  stale_rental_grant: 0,
  payment_order_grant_state_mismatch: 0,
};

function appendAnomaly(list: OrderIntegrityAnomaly[], anomaly: OrderIntegrityAnomaly, limit: number) {
  if (list.length < limit) {
    list.push(anomaly);
  }
}

export async function getOrderIntegritySnapshot(limit = 60): Promise<OrderIntegritySnapshot> {
  const anomalies: OrderIntegrityAnomaly[] = [];
  const totals = { ...defaultTotals };
  const now = new Date();

  const [paidOrdersMissingGrants, grantsWithoutPaidFlow, promoRows, staleRentals, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        items: {
          some: {
            accessGrants: {
              none: { status: AccessGrantStatus.ACTIVE },
            },
          },
        },
      },
      select: { id: true, userId: true, status: true },
      take: Math.max(limit * 2, 120),
      orderBy: { createdAt: "desc" },
    }),
    prisma.accessGrant.findMany({
      where: {
        status: AccessGrantStatus.ACTIVE,
        orderItemId: { not: null },
        orderItem: {
          order: {
            status: { not: OrderStatus.PAID },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        orderItem: { select: { orderId: true } },
      },
      take: Math.max(limit * 2, 120),
      orderBy: { createdAt: "desc" },
    }),
    prisma.promoRedemption.findMany({
      where: {
        OR: [
          {
            status: PromoRedemptionStatus.APPLIED,
            order: { status: OrderStatus.PAID },
          },
          {
            status: PromoRedemptionStatus.REDEEMED,
            paymentId: null,
            order: { totalCents: { gt: 0 } },
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        orderId: true,
        status: true,
        paymentId: true,
        order: { select: { status: true, totalCents: true } },
      },
      take: Math.max(limit * 2, 120),
      orderBy: { createdAt: "desc" },
    }),
    prisma.accessGrant.findMany({
      where: {
        type: AccessGrantType.RENTAL,
        status: AccessGrantStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      select: { id: true, userId: true, orderItem: { select: { orderId: true } } },
      take: Math.max(limit * 2, 120),
      orderBy: { expiresAt: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { status: PaymentStatus.SUCCEEDED, order: { status: { not: OrderStatus.PAID } } },
          { status: PaymentStatus.PENDING, order: { status: OrderStatus.PAID } },
          { status: PaymentStatus.FAILED, order: { status: OrderStatus.PAID } },
        ],
      },
      select: {
        id: true,
        userId: true,
        status: true,
        orderId: true,
        order: { select: { status: true } },
      },
      take: Math.max(limit * 2, 120),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  for (const order of paidOrdersMissingGrants) {
    if (!isPaidOrderMissingGrant({ orderStatus: order.status, hasItems: true, activeGrantCount: 0 })) continue;
    totals.paid_order_missing_grants += 1;
    appendAnomaly(anomalies, {
      kind: "paid_order_missing_grants",
      orderId: order.id,
      userId: order.userId,
      details: "الطلب مدفوع لكن لا توجد منح وصول نشطة مرتبطة بعناصر الطلب.",
    }, limit);
  }

  for (const grant of grantsWithoutPaidFlow) {
    totals.grant_without_paid_flow += 1;
    appendAnomaly(anomalies, {
      kind: "grant_without_paid_flow",
      orderId: grant.orderItem?.orderId ?? "—",
      userId: grant.userId,
      details: `منحة وصول نشطة مرتبطة بطلب غير مدفوع. grant=${grant.id}`,
    }, limit);
  }

  for (const redemption of promoRows) {
    totals.promo_redemption_mismatch += 1;
    appendAnomaly(anomalies, {
      kind: "promo_redemption_mismatch",
      orderId: redemption.orderId,
      userId: redemption.userId,
      details:
        redemption.status === PromoRedemptionStatus.APPLIED
          ? "الطلب مدفوع لكن redemption ما زالت APPLIED ولم تُحوّل إلى REDEEMED."
          : "redemption REDEEMED بدون paymentId صالح لطلب مدفوع غير مجاني.",
    }, limit);
  }

  for (const grant of staleRentals) {
    totals.stale_rental_grant += 1;
    appendAnomaly(anomalies, {
      kind: "stale_rental_grant",
      orderId: grant.orderItem?.orderId ?? "—",
      userId: grant.userId,
      details: `منحة إيجار منتهية زمنيًا ما زالت ACTIVE. grant=${grant.id}`,
    }, limit);
  }

  for (const payment of payments) {
    totals.payment_order_grant_state_mismatch += 1;
    appendAnomaly(anomalies, {
      kind: "payment_order_grant_state_mismatch",
      orderId: payment.orderId,
      userId: payment.userId,
      details: `حالة الدفع (${payment.status}) لا تتوافق مع حالة الطلب (${payment.order.status}). payment=${payment.id}`,
    }, limit);
  }

  return { totals, anomalies };
}

type RecoverOrderDeps = {
  transaction: <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
  grantAccess: typeof grantAccessForPaidOrder;
};

const defaultRecoverDeps: RecoverOrderDeps = {
  transaction: (run) => prisma.$transaction((tx) => run(tx), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  grantAccess: grantAccessForPaidOrder,
};

export async function recoverMissingGrantsForPaidOrder(orderId: string, deps: RecoverOrderDeps = defaultRecoverDeps) {
  return deps.transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { select: { status: true } },
        items: { select: { id: true } },
      },
    });

    if (!order) {
      return { ok: false as const, reason: "order_not_found" as const, recovered: 0 };
    }

    if (order.status !== OrderStatus.PAID) {
      return { ok: false as const, reason: "order_not_paid" as const, recovered: 0 };
    }

    const succeededPayments = order.payments.filter((payment) => payment.status === PaymentStatus.SUCCEEDED).length;
    if (!isEligibleForGrantRecovery({ orderStatus: order.status, totalCents: order.totalCents, succeededPayments })) {
      return { ok: false as const, reason: "missing_succeeded_payment" as const, recovered: 0 };
    }

    const before = await tx.accessGrant.count({
      where: {
        userId: order.userId,
        status: AccessGrantStatus.ACTIVE,
        orderItem: { orderId: order.id },
      },
    });

    await deps.grantAccess(tx, { orderId: order.id, userId: order.userId, grantedAt: new Date() });

    const after = await tx.accessGrant.count({
      where: {
        userId: order.userId,
        status: AccessGrantStatus.ACTIVE,
        orderItem: { orderId: order.id },
      },
    });

    return {
      ok: true as const,
      reason: "recovered" as const,
      recovered: Math.max(0, after - before),
      alreadyHealthy: after > 0 && before === after,
    };
  });
}

export async function recheckPromoRedemptionLinkage(orderId?: string) {
  const where: Prisma.PromoRedemptionWhereInput = orderId
    ? { orderId }
    : {
        OR: [
          { status: PromoRedemptionStatus.APPLIED, order: { status: OrderStatus.PAID } },
          { status: PromoRedemptionStatus.REDEEMED, paymentId: null, order: { totalCents: { gt: 0 } } },
        ],
      };

  const rows = await prisma.promoRedemption.findMany({
    where,
    include: {
      order: {
        select: {
          status: true,
          totalCents: true,
          payments: { where: { status: PaymentStatus.SUCCEEDED }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  const fixes: Array<{ redemptionId: string; action: string }> = [];

  for (const redemption of rows) {
    if (redemption.status === PromoRedemptionStatus.APPLIED && redemption.order.status === OrderStatus.PAID) {
      const paymentId = redemption.paymentId ?? redemption.order.payments[0]?.id ?? null;
      await prisma.promoRedemption.update({
        where: { id: redemption.id },
        data: {
          status: PromoRedemptionStatus.REDEEMED,
          redeemedAt: redemption.redeemedAt ?? new Date(),
          paymentId,
        },
      });
      fixes.push({ redemptionId: redemption.id, action: "marked_redeemed" });
      continue;
    }

    if (redemption.status === PromoRedemptionStatus.REDEEMED && !redemption.paymentId && redemption.order.totalCents > 0) {
      const paymentId = redemption.order.payments[0]?.id;
      if (!paymentId) {
        continue;
      }
      await prisma.promoRedemption.update({ where: { id: redemption.id }, data: { paymentId } });
      fixes.push({ redemptionId: redemption.id, action: "linked_payment" });
    }
  }

  return {
    inspected: rows.length,
    fixed: fixes.length,
    fixes,
  };
}

export async function resolveStaleRentalGrants() {
  const result = await prisma.accessGrant.updateMany({
    where: {
      type: AccessGrantType.RENTAL,
      status: AccessGrantStatus.ACTIVE,
      expiresAt: { lt: new Date() },
    },
    data: {
      status: AccessGrantStatus.EXPIRED,
      revokedAt: null,
    },
  });

  return { expired: result.count };
}

export async function getUserIntegritySummary(userId: string) {
  const [paidWithoutGrant, suspiciousGrantCount, staleRentalCount] = await Promise.all([
    prisma.order.count({
      where: {
        userId,
        status: OrderStatus.PAID,
        items: {
          some: {
            accessGrants: {
              none: { status: AccessGrantStatus.ACTIVE },
            },
          },
        },
      },
    }),
    prisma.accessGrant.count({
      where: {
        userId,
        status: AccessGrantStatus.ACTIVE,
        orderItem: {
          order: {
            status: { not: OrderStatus.PAID },
          },
        },
      },
    }),
    prisma.accessGrant.count({
      where: {
        userId,
        type: AccessGrantType.RENTAL,
        status: AccessGrantStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
    }),
  ]);

  return {
    paidWithoutGrant,
    suspiciousGrantCount,
    staleRentalCount,
    totalWarnings: paidWithoutGrant + suspiciousGrantCount + staleRentalCount,
  };
}
