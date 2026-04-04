import { AdminAuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminAuditLogInput = {
  actorAdminId: string;
  action: AdminAuditAction;
  reason?: string | null;
  targetUserId?: string | null;
  paymentAttemptId?: string | null;
  orderId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function createAdminAuditLog(input: AdminAuditLogInput) {
  return prisma.adminAuditLog.create({
    data: {
      actorAdminId: input.actorAdminId,
      action: input.action,
      reason: input.reason?.trim() || null,
      targetUserId: input.targetUserId ?? null,
      paymentAttemptId: input.paymentAttemptId ?? null,
      orderId: input.orderId ?? null,
      metadata: input.metadata,
    },
  });
}
