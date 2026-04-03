"use server";

import { AdminAuditAction, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { logAdminAudit } from "@/lib/audit-admin";
import { prisma } from "@/lib/prisma";
import { invalidateUserSessions } from "@/lib/session-invalidation";
import { revokeTrustedDevice } from "@/lib/trusted-device";

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function auditUserAction(input: {
  actorAdminId: string;
  action: AdminAuditAction;
  targetUserId: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await logAdminAudit({
    actorAdminId: input.actorAdminId,
    action: input.action,
    targetUserId: input.targetUserId,
    reason: input.reason,
    metadata: input.metadata,
  });
}

export async function banUserAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");

  if (!targetUserId || targetUserId === admin.id) return;

  await prisma.user.updateMany({
    where: { id: targetUserId, isActive: true },
    data: {
      isActive: false,
      sessionVersion: { increment: 1 },
    },
  });

  await auditUserAction({ actorAdminId: admin.id, action: "USER_BANNED", targetUserId, reason: reason || "ban" });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function unbanUserAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");
  if (!targetUserId) return;

  await prisma.user.updateMany({ where: { id: targetUserId, isActive: false }, data: { isActive: true } });
  await auditUserAction({ actorAdminId: admin.id, action: "USER_UNBANNED", targetUserId, reason: reason || "unban" });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function adminForceLogoutAllDevicesAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");
  if (!targetUserId) return;

  await invalidateUserSessions(targetUserId);
  await prisma.userSecurityEvent.create({ data: { userId: targetUserId, type: "FORCE_LOGOUT_ALL" } });

  await auditUserAction({
    actorAdminId: admin.id,
    action: "USER_FORCE_LOGOUT_ALL",
    targetUserId,
    reason: reason || "force logout",
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function forcePasswordResetAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");
  if (!targetUserId) return;

  await prisma.user.update({
    where: { id: targetUserId },
    data: { requirePasswordReset: true, sessionVersion: { increment: 1 } },
  });

  await prisma.userSecurityEvent.create({ data: { userId: targetUserId, type: "PASSWORD_RESET_REQUIRED" } });

  await auditUserAction({
    actorAdminId: admin.id,
    action: "USER_FORCE_PASSWORD_RESET",
    targetUserId,
    reason: reason || "force password reset",
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function revokeTrustedDeviceAction(formData: FormData) {
  const admin = await requireAdmin({ callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const deviceId = getValue(formData, "deviceId");
  const reason = getValue(formData, "reason");

  if (!targetUserId || !deviceId) return;

  const revoked = await revokeTrustedDevice({ userId: targetUserId, deviceId });
  if (!revoked) return;

  await prisma.userSecurityEvent.create({
    data: {
      userId: targetUserId,
      type: "TRUSTED_DEVICE_REVOKED",
      metadata: { deviceId },
    },
  });

  await auditUserAction({
    actorAdminId: admin.id,
    action: "TRUSTED_DEVICE_REVOKED",
    targetUserId,
    reason: reason || "trusted device revoked",
    metadata: { deviceId },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}
