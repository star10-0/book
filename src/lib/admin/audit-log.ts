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

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }

  const objectValue = value as Record<string, unknown>;
  for (const child of Object.values(objectValue)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

export function buildImmutableAuditMetadata<T extends Prisma.InputJsonValue>(metadata: T): T {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }

  const cloned = JSON.parse(JSON.stringify(metadata)) as T;
  return deepFreeze(cloned);
}

export async function createAdminAuditLog(input: AdminAuditLogInput) {
  const immutableMetadata = input.metadata === undefined ? undefined : buildImmutableAuditMetadata(input.metadata);
  return prisma.adminAuditLog.create({
    data: {
      actorAdminId: input.actorAdminId,
      action: input.action,
      reason: input.reason?.trim() || null,
      targetUserId: input.targetUserId ?? null,
      paymentAttemptId: input.paymentAttemptId ?? null,
      orderId: input.orderId ?? null,
      metadata: immutableMetadata,
    },
  });
}
