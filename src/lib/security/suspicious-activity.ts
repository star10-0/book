import { Prisma, UserSecurityEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const BLOCKED_DEVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const BLOCKED_DEVICE_THRESHOLD = 3;

export function isRepeatedBlockedDeviceSuspicious(blockedAttempts: number) {
  return blockedAttempts >= BLOCKED_DEVICE_THRESHOLD;
}

export async function logUserSecurityEvent(input: {
  userId: string;
  type: UserSecurityEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.userSecurityEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata,
    },
  });
}

export async function maybeLogRepeatedBlockedDevicePattern(input: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const since = new Date(Date.now() - BLOCKED_DEVICE_WINDOW_MS);
  const blockedAttempts = await prisma.userSecurityEvent.count({
    where: {
      userId: input.userId,
      type: UserSecurityEventType.LOGIN_BLOCKED_UNTRUSTED_DEVICE,
      createdAt: { gte: since },
    },
  });

  if (isRepeatedBlockedDeviceSuspicious(blockedAttempts)) {
    await logUserSecurityEvent({
      userId: input.userId,
      type: UserSecurityEventType.SUSPICIOUS_ACCOUNT_ACTIVITY,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        signal: "repeated_blocked_device_attempts",
        blockedAttempts,
        windowHours: 24,
      },
    });
  }

  return blockedAttempts;
}
