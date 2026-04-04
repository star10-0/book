"use server";

import { AdminAuditAction, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdminScope } from "@/lib/auth-session";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import {
  banUserByAdmin,
  forceLogoutAllSessionsByAdmin,
  forcePasswordResetByAdmin,
  unbanUserByAdmin,
} from "@/lib/admin/user-management";
import { prisma } from "@/lib/prisma";
import { revokeAllTrustedDevicesForRebind, revokeTrustedDevice } from "@/lib/trusted-device";

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
  await createAdminAuditLog({
    actorAdminId: input.actorAdminId,
    action: input.action,
    targetUserId: input.targetUserId,
    reason: input.reason,
    metadata: input.metadata,
  });
}

export async function banUserAction(formData: FormData) {
  const admin = await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");

  if (!targetUserId) return;

  await banUserByAdmin({ actorAdminId: admin.id, targetUserId, reason });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function unbanUserAction(formData: FormData) {
  const admin = await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");
  if (!targetUserId) return;

  await unbanUserByAdmin({ actorAdminId: admin.id, targetUserId, reason });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function adminForceLogoutAllDevicesAction(formData: FormData) {
  const admin = await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");
  if (!targetUserId) return;

  await forceLogoutAllSessionsByAdmin({ actorAdminId: admin.id, targetUserId, reason });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function forcePasswordResetAction(formData: FormData) {
  const admin = await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");
  if (!targetUserId) return;

  await forcePasswordResetByAdmin({ actorAdminId: admin.id, targetUserId, reason });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}

export async function revokeTrustedDeviceAction(formData: FormData) {
  const admin = await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
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

export async function requireTrustedDeviceRebindAction(formData: FormData) {
  const admin = await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
  const targetUserId = getValue(formData, "targetUserId");
  const reason = getValue(formData, "reason");

  if (!targetUserId) return;

  const revokedCount = await revokeAllTrustedDevicesForRebind(targetUserId);
  if (revokedCount === 0) return;

  await prisma.userSecurityEvent.create({
    data: {
      userId: targetUserId,
      type: "TRUSTED_DEVICE_REVOKED",
      metadata: { mode: "all", requireRebind: true, revokedCount },
    },
  });

  await auditUserAction({
    actorAdminId: admin.id,
    action: "TRUSTED_DEVICE_REVOKED",
    targetUserId,
    reason: reason || "trusted devices revoked; rebind required",
    metadata: { mode: "all", requireRebind: true, revokedCount },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
}
