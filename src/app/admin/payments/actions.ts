"use server";

import { PaymentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { logAdminAudit } from "@/lib/audit-admin";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { prisma } from "@/lib/prisma";
import { reconcilePaymentByTransactionReference, verifyPayment } from "@/lib/payments/payment-service";

function val(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function audit(actorAdminId: string, action: Parameters<typeof logAdminAudit>[0]["action"], paymentAttemptId: string, reason?: string, metadata?: Prisma.InputJsonValue) {
  await logAdminAudit({
    actorAdminId,
    action,
    paymentAttemptId,
    reason: reason || null,
    metadata,
  });
}

export async function retryVerifyPaymentAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const reason = val(formData, "reason");
  if (!attemptId || !userId) return;

  await verifyPayment({ attemptId, userId });
  await audit(admin.id, "PAYMENT_RETRY_VERIFY", attemptId, reason || "retry verify");

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}

export async function reconcileByTxAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const transactionReference = val(formData, "transactionReference");
  const reason = val(formData, "reason");

  if (!attemptId || !userId || !transactionReference) return;

  await reconcilePaymentByTransactionReference({ attemptId, userId, transactionReference });
  await audit(admin.id, "PAYMENT_RECONCILE_BY_TX", attemptId, reason || "reconcile by tx", { transactionReference });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}

export async function forceGrantPaymentAccessAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const reason = val(formData, "reason");

  if (!attemptId || !reason) return;

  await prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: true, payment: true } });
    if (!attempt) return;

    const activeGrants = await tx.accessGrant.count({
      where: {
        userId: attempt.userId,
        orderItem: { orderId: attempt.orderId },
        status: "ACTIVE",
      },
    });

    if (activeGrants === 0) {
      await grantAccessForPaidOrder(tx, { orderId: attempt.orderId, userId: attempt.userId, grantedAt: new Date() });
    }

    await tx.payment.update({
      where: { id: attempt.paymentId },
      data: { status: PaymentStatus.SUCCEEDED, paidAt: attempt.payment.paidAt ?? new Date(), failedAt: null },
    });

    await tx.order.update({
      where: { id: attempt.orderId },
      data: { status: "PAID", placedAt: attempt.order.placedAt ?? new Date() },
    });

    await tx.paymentAttempt.update({
      where: { id: attemptId },
      data: { status: "PAID", verifiedAt: attempt.verifiedAt ?? new Date(), failureReason: null },
    });
  });

  await audit(admin.id, "PAYMENT_FORCE_GRANT_ACCESS", attemptId, reason, { forced: true });
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}

export async function releasePaymentTxLockAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const reason = val(formData, "reason");
  if (!attemptId || !reason) return;

  const released = await prisma.paymentAttempt.updateMany({
    where: { id: attemptId, status: "VERIFYING" },
    data: {
      status: "FAILED",
      failureReason: `Admin released verification lock: ${reason}`,
      verifiedAt: new Date(),
    },
  });

  await audit(admin.id, "PAYMENT_TX_LOCK_RELEASED", attemptId, reason, { releasedCount: released.count });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}
