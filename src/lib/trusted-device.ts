import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const TRUSTED_DEVICE_COOKIE = "book_device";
const TRUSTED_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getOrCreateDeviceToken() {
  const store = await cookies();
  const existing = store.get(TRUSTED_DEVICE_COOKIE)?.value;

  if (existing && existing.length >= 32) {
    return existing;
  }

  const token = randomBytes(32).toString("base64url");
  store.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
  });

  return token;
}


export function classifyTrustedDeviceLogin(input: {
  activeTokenHashes: string[];
  currentTokenHash: string;
}) {
  if (input.activeTokenHashes.length === 0) {
    return { decision: "register_primary" as const };
  }

  if (input.activeTokenHashes.includes(input.currentTokenHash)) {
    return { decision: "allow_existing" as const };
  }

  return { decision: "block_untrusted" as const };
}

export async function enforceTrustedDeviceOnLogin(input: {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const token = await getOrCreateDeviceToken();
  const tokenHash = hashToken(token);

  const devices = await prisma.userTrustedDevice.findMany({
    where: {
      userId: input.userId,
      revokedAt: null,
      isTrusted: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const matched = devices.find((device) => device.tokenHash === tokenHash);
  const decision = classifyTrustedDeviceLogin({
    activeTokenHashes: devices.map((device) => device.tokenHash),
    currentTokenHash: tokenHash,
  });

  if (decision.decision === "allow_existing" && matched) {
    await prisma.$transaction([
      prisma.userTrustedDevice.update({
        where: { id: matched.id },
        data: {
          lastSeenAt: now,
          userAgent: input.userAgent || matched.userAgent,
          ipAddress: input.ipAddress || matched.ipAddress,
        },
      }),
      prisma.user.update({ where: { id: input.userId }, data: { lastSeenAt: now } }),
      prisma.userSecurityEvent.create({
        data: {
          userId: input.userId,
          type: "LOGIN_SUCCESS",
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
          metadata: { trustedDeviceId: matched.id },
        },
      }),
    ]);

    return { allowed: true as const, matchedDeviceId: matched.id };
  }

  if (decision.decision === "register_primary") {
    const created = await prisma.userTrustedDevice.create({
      data: {
        userId: input.userId,
        tokenHash,
        isTrusted: true,
        isPrimary: true,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.user.update({ where: { id: input.userId }, data: { lastSeenAt: now } }),
      prisma.userSecurityEvent.create({
        data: {
          userId: input.userId,
          type: "TRUSTED_DEVICE_REGISTERED",
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
          metadata: { trustedDeviceId: created.id, primary: true },
        },
      }),
    ]);

    return { allowed: true as const, matchedDeviceId: created.id };
  }

  await prisma.userSecurityEvent.create({
    data: {
      userId: input.userId,
      type: "LOGIN_BLOCKED_UNTRUSTED_DEVICE",
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      metadata: { activeTrustedDevices: devices.length },
    },
  });

  return { allowed: false as const };
}

export async function revokeTrustedDevice(input: { userId: string; deviceId: string }) {
  const result = await prisma.userTrustedDevice.updateMany({
    where: { id: input.deviceId, userId: input.userId, revokedAt: null },
    data: { revokedAt: new Date(), isTrusted: false, isPrimary: false },
  });

  return result.count > 0;
}

export const __trustedDeviceInternals = { classifyTrustedDeviceLogin };
