import { AdminAuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminAuditInput = {
  actorAdminId: string;
  action: AdminAuditAction;
  reason?: string | null;
  targetUserId?: string | null;
  paymentAttemptId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAdminAudit(input: AdminAuditInput) {
  return prisma.adminAuditLog.create({
    data: {
      actorAdminId: input.actorAdminId,
      action: input.action,
      reason: input.reason?.trim() || null,
      targetUserId: input.targetUserId ?? null,
      paymentAttemptId: input.paymentAttemptId ?? null,
      metadata: input.metadata,
    },
  });
}
