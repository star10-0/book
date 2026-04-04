import { AdminAuditAction, Prisma } from "@prisma/client";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import { prisma } from "@/lib/prisma";

export type AdminUserActionInput = {
  actorAdminId: string;
  targetUserId: string;
  reason?: string;
};

type UserRecord = {
  id: string;
  isActive: boolean;
  sessionVersion: number;
  requirePasswordReset: boolean;
  bannedReason: string | null;
};

type AdminUserManagementDeps = {
  findUserById: (userId: string) => Promise<UserRecord | null>;
  updateUser: (userId: string, data: Prisma.UserUpdateInput) => Promise<void>;
  createSecurityEvent: (userId: string, type: "FORCE_LOGOUT_ALL" | "PASSWORD_RESET_REQUIRED", metadata?: Prisma.InputJsonValue) => Promise<void>;
  createAuditLog: (input: {
    actorAdminId: string;
    targetUserId: string;
    action: AdminAuditAction;
    reason?: string;
    metadata?: Prisma.InputJsonValue;
  }) => Promise<void>;
};

const defaultDeps: AdminUserManagementDeps = {
  findUserById: async (userId) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
        sessionVersion: true,
        requirePasswordReset: true,
        bannedReason: true,
      },
    }),
  updateUser: async (userId, data) => {
    await prisma.user.update({ where: { id: userId }, data, select: { id: true } });
  },
  createSecurityEvent: async (userId, type, metadata) => {
    await prisma.userSecurityEvent.create({
      data: { userId, type, metadata },
      select: { id: true },
    });
  },
  createAuditLog: async ({ actorAdminId, targetUserId, action, reason, metadata }) => {
    await createAdminAuditLog({
      actorAdminId,
      targetUserId,
      action,
      reason,
      metadata,
    });
  },
};

function normalizeReason(reason?: string) {
  return reason?.trim() || undefined;
}

export async function banUserByAdmin(input: AdminUserActionInput, deps: AdminUserManagementDeps = defaultDeps) {
  if (input.actorAdminId === input.targetUserId) return { ok: false as const, code: "SELF_ACTION" as const };

  const user = await deps.findUserById(input.targetUserId);
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const };

  const reason = normalizeReason(input.reason) ?? "ban";

  await deps.updateUser(input.targetUserId, {
    isActive: false,
    bannedReason: reason,
    sessionVersion: { increment: 1 },
  });

  await deps.createSecurityEvent(input.targetUserId, "FORCE_LOGOUT_ALL", { source: "admin_ban" });

  await deps.createAuditLog({
    actorAdminId: input.actorAdminId,
    targetUserId: input.targetUserId,
    action: "USER_BANNED",
    reason,
    metadata: {
      previous: {
        isActive: user.isActive,
        sessionVersion: user.sessionVersion,
      },
      next: {
        isActive: false,
        sessionVersion: user.sessionVersion + 1,
      },
    },
  });

  return { ok: true as const };
}

export async function unbanUserByAdmin(input: AdminUserActionInput, deps: AdminUserManagementDeps = defaultDeps) {
  const user = await deps.findUserById(input.targetUserId);
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const };

  const reason = normalizeReason(input.reason) ?? "unban";

  await deps.updateUser(input.targetUserId, {
    isActive: true,
    bannedReason: null,
  });

  await deps.createAuditLog({
    actorAdminId: input.actorAdminId,
    targetUserId: input.targetUserId,
    action: "USER_UNBANNED",
    reason,
    metadata: {
      previous: {
        isActive: user.isActive,
        bannedReason: user.bannedReason,
      },
      next: {
        isActive: true,
        bannedReason: null,
      },
    },
  });

  return { ok: true as const };
}

export async function forceLogoutAllSessionsByAdmin(input: AdminUserActionInput, deps: AdminUserManagementDeps = defaultDeps) {
  const user = await deps.findUserById(input.targetUserId);
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const };

  const reason = normalizeReason(input.reason) ?? "force logout";

  await deps.updateUser(input.targetUserId, {
    sessionVersion: { increment: 1 },
  });

  await deps.createSecurityEvent(input.targetUserId, "FORCE_LOGOUT_ALL");

  await deps.createAuditLog({
    actorAdminId: input.actorAdminId,
    targetUserId: input.targetUserId,
    action: "USER_FORCE_LOGOUT_ALL",
    reason,
    metadata: {
      previous: { sessionVersion: user.sessionVersion },
      next: { sessionVersion: user.sessionVersion + 1 },
    },
  });

  return { ok: true as const };
}

export async function forcePasswordResetByAdmin(input: AdminUserActionInput, deps: AdminUserManagementDeps = defaultDeps) {
  const user = await deps.findUserById(input.targetUserId);
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const };

  const reason = normalizeReason(input.reason) ?? "force password reset";

  await deps.updateUser(input.targetUserId, {
    requirePasswordReset: true,
    sessionVersion: { increment: 1 },
  });

  await deps.createSecurityEvent(input.targetUserId, "PASSWORD_RESET_REQUIRED");

  await deps.createAuditLog({
    actorAdminId: input.actorAdminId,
    targetUserId: input.targetUserId,
    action: "USER_FORCE_PASSWORD_RESET",
    reason,
    metadata: {
      previous: {
        requirePasswordReset: user.requirePasswordReset,
        sessionVersion: user.sessionVersion,
      },
      next: {
        requirePasswordReset: true,
        sessionVersion: user.sessionVersion + 1,
      },
    },
  });

  return { ok: true as const };
}
