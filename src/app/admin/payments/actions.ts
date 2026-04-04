"use server";

import { PaymentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import {
  canReleaseTxLock,
  canRecoverPaymentAttempt,
  isAuditReasonValid,
  isPaymentOrderStateConsistent,
  shouldEnsureGrantForPaidState,
  shouldForceGrantAccess,
} from "@/lib/admin/payment-admin";
import { prisma } from "@/lib/prisma";
import { reconcilePaymentByTransactionReference, recoverPaymentAttempt, verifyPayment } from "@/lib/payments/payment-service";

function val(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function audit(actorAdminId: string, action: Parameters<typeof createAdminAuditLog>[0]["action"], paymentAttemptId: string, reason?: string, metadata?: Prisma.InputJsonValue, orderId?: string) {
  await createAdminAuditLog({
    actorAdminId,
    action,
    paymentAttemptId,
    reason: reason || null,
    metadata,
    orderId: orderId ?? null,
  });
}

export async function retryVerifyPaymentAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const reason = val(formData, "reason");
  if (!attemptId || !userId || !isAuditReasonValid(reason)) return;

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

  if (!attemptId || !userId || !transactionReference || !isAuditReasonValid(reason)) return;

  await reconcilePaymentByTransactionReference({ attemptId, userId, transactionReference });
  await audit(admin.id, "PAYMENT_RECONCILE_BY_TX", attemptId, reason || "reconcile by tx", { transactionReference });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}

export async function forceGrantPaymentAccessAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const reason = val(formData, "reason");

  if (!attemptId || !isAuditReasonValid(reason)) return;

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

    if (shouldForceGrantAccess(activeGrants)) {
      await grantAccessForPaidOrder(tx, { orderId: attempt.orderId, userId: attempt.userId, grantedAt: new Date() });
    }

    if (
      !isPaymentOrderStateConsistent({
        paymentStatus: "SUCCEEDED",
        orderStatus: "PAID",
      })
    ) {
      return;
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

  const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId }, select: { orderId: true } });
  await audit(admin.id, "PAYMENT_FORCE_GRANT_ACCESS", attemptId, reason, { forced: true }, attempt?.orderId);
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}

export async function releasePaymentTxLockAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const reason = val(formData, "reason");
  if (!attemptId || !isAuditReasonValid(reason)) return;

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: { status: true },
  });

  if (!attempt || !canReleaseTxLock(attempt.status)) return;

  const released = await prisma.paymentAttempt.updateMany({
    where: { id: attemptId, status: attempt.status },
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

export async function recoverStuckAttemptAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const transactionReference = val(formData, "transactionReference");
  const reason = val(formData, "reason");
  if (!attemptId || !userId || !isAuditReasonValid(reason)) return;

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: { payment: true, order: true },
  });
  if (!attempt) return;

  if (
    shouldEnsureGrantForPaidState({
      attemptStatus: attempt.status,
      paymentStatus: attempt.payment.status,
      orderStatus: attempt.order.status,
    })
  ) {
    await prisma.$transaction(async (tx) => {
      const activeGrants = await tx.accessGrant.count({
        where: {
          userId: attempt.userId,
          orderItem: { orderId: attempt.orderId },
          status: "ACTIVE",
        },
      });

      if (shouldForceGrantAccess(activeGrants)) {
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
        where: { id: attempt.id },
        data: { status: "PAID", verifiedAt: attempt.verifiedAt ?? new Date(), failureReason: null },
      });
    });
  } else {
    if (!canRecoverPaymentAttempt(attempt.status) && attempt.status !== "SUBMITTED") return;

    await recoverPaymentAttempt({
      attemptId,
      userId,
      transactionReference: transactionReference || undefined,
    });
  }

  await audit(admin.id, "PAYMENT_RETRY_VERIFY", attemptId, reason, { recovery: true, transactionReference: transactionReference || null }, attempt.orderId);
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
}
