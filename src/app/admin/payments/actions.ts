"use server";

import { PaymentStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminScope } from "@/lib/auth-session";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import {
  canReleaseTxLock,
  canRecoverPaymentAttempt,
  classifyPaymentIncident,
  isBreakGlassPaymentOverrideEnabled,
  isAuditReasonValid,
  isPaymentOrderStateConsistent,
  shouldEnsureGrantForPaidState,
  shouldForceGrantAccess,
  validateBreakGlassForceGrantInput,
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
  const admin = await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const reason = val(formData, "reason");
  if (!attemptId || !userId || !isAuditReasonValid(reason)) {
    return;
  }

  const result = await verifyPayment({ attemptId, userId });
  await audit(admin.id, "PAYMENT_RETRY_VERIFY", attemptId, reason || "retry verify", {
    resultStatus: result.status,
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
  return;
}

export async function reconcileByTxAction(formData: FormData) {
  const admin = await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const transactionReference = val(formData, "transactionReference");
  const reason = val(formData, "reason");

  if (!attemptId || !userId || !transactionReference || !isAuditReasonValid(reason)) {
    return;
  }

  const result = await reconcilePaymentByTransactionReference({ attemptId, userId, transactionReference });
  await audit(admin.id, "PAYMENT_RECONCILE_BY_TX", attemptId, reason || "reconcile by tx", {
    transactionReference,
    resultStatus: result.status,
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
  return;
}

export async function forceGrantPaymentAccessAction(formData: FormData) {
  const admin = await requireAdminScope("BREAK_GLASS_PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const reason = val(formData, "reason");
  const incidentTicketId = val(formData, "incidentTicketId");

  if (!attemptId) {
    return;
  }

  const validation = validateBreakGlassForceGrantInput({ reason, incidentTicketId });
  if (!validation.allowed) {
    await audit(
      admin.id,
      "PAYMENT_FORCE_GRANT_ACCESS",
      attemptId,
      reason || "break-glass force grant denied",
      {
        denied: true,
        denialCode: validation.code,
        incidentTicketId: incidentTicketId || null,
        breakGlassGateEnabled: isBreakGlassPaymentOverrideEnabled(),
      },
    );
    return;
  }

  const operationResult = await prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: true, payment: true } });
    if (!attempt) {
      return {
        changed: false,
        alreadyGranted: false,
        orderId: null as string | null,
        reason: "attempt_not_found",
        beforeState: null,
        afterState: null,
      };
    }

    const beforeState = {
      attemptStatus: attempt.status,
      paymentStatus: attempt.payment.status,
      orderStatus: attempt.order.status,
      paymentPaidAt: attempt.payment.paidAt?.toISOString() ?? null,
      orderPlacedAt: attempt.order.placedAt?.toISOString() ?? null,
      attemptVerifiedAt: attempt.verifiedAt?.toISOString() ?? null,
    } as const;

    const consistentInput = isPaymentOrderStateConsistent({
      paymentStatus: attempt.payment.status,
      orderStatus: attempt.order.status,
    });

    if (!consistentInput) {
      return { changed: false, alreadyGranted: false, orderId: attempt.orderId, reason: "inconsistent_state", beforeState, afterState: null };
    }

    const activeGrants = await tx.accessGrant.count({
      where: {
        userId: attempt.userId,
        orderItem: { orderId: attempt.orderId },
        status: "ACTIVE",
      },
    });

    const alreadyGranted = !shouldForceGrantAccess(activeGrants);
    if (!alreadyGranted) {
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

    const updated = await tx.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: { order: true, payment: true },
    });

    const afterState = updated
      ? {
          attemptStatus: updated.status,
          paymentStatus: updated.payment.status,
          orderStatus: updated.order.status,
          paymentPaidAt: updated.payment.paidAt?.toISOString() ?? null,
          orderPlacedAt: updated.order.placedAt?.toISOString() ?? null,
          attemptVerifiedAt: updated.verifiedAt?.toISOString() ?? null,
        }
      : null;

    return { changed: true, alreadyGranted, orderId: attempt.orderId, reason: null as string | null, beforeState, afterState };
  });

  await audit(
    admin.id,
    "PAYMENT_FORCE_GRANT_ACCESS",
    attemptId,
    reason,
    {
      mode: "break_glass",
      bypassesProviderSettlement: true,
      incidentTicketId: validation.normalizedIncidentTicketId,
      forced: operationResult?.changed ?? false,
      alreadyGranted: operationResult?.alreadyGranted ?? false,
      skippedReason: operationResult?.reason ?? null,
      beforeState: operationResult?.beforeState ?? null,
      afterState: operationResult?.afterState ?? null,
      immutable: true,
    },
    operationResult?.orderId ?? undefined,
  );
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
  if (operationResult.reason === "attempt_not_found") {
    return;
  }

  if (operationResult.reason === "inconsistent_state") {
    return;
  }

  return;
}

export async function releasePaymentTxLockAction(formData: FormData) {
  const admin = await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const reason = val(formData, "reason");
  if (!attemptId || !isAuditReasonValid(reason)) {
    return;
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: { status: true },
  });

  if (!attempt) {
    return;
  }
  if (!canReleaseTxLock(attempt.status)) {
    return;
  }

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
  return;
}

export async function recoverStuckAttemptAction(formData: FormData) {
  const admin = await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const attemptId = val(formData, "attemptId");
  const userId = val(formData, "userId");
  const transactionReference = val(formData, "transactionReference");
  const reason = val(formData, "reason");
  if (!attemptId || !userId || !isAuditReasonValid(reason)) {
    return;
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: { payment: true, order: true },
  });
  if (!attempt) {
    return;
  }

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
    if (!canRecoverPaymentAttempt(attempt.status) && attempt.status !== "SUBMITTED") {
      return;
    }

    await recoverPaymentAttempt({
      attemptId,
      userId,
      transactionReference: transactionReference || undefined,
    });
  }

  const incidentLabel = classifyPaymentIncident({
    attemptStatus: attempt.status,
    paymentStatus: attempt.payment.status,
    orderStatus: attempt.order.status,
    hasAccessGrant: false,
    failureReason: attempt.failureReason,
    hasTransactionReference: Boolean(transactionReference),
    providerReferenceMatchesPayment: !attempt.payment.providerRef || attempt.payment.providerRef === attempt.providerReference,
  });

  await audit(
    admin.id,
    "PAYMENT_RETRY_VERIFY",
    attemptId,
    reason,
    {
      recovery: true,
      transactionReference: transactionReference || null,
      incidentLabel,
    },
    attempt.orderId,
  );
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/payments/${attemptId}`);
  return;
}
