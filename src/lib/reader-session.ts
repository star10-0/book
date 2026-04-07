import { AccessGrantStatus, AccessGrantType, Prisma } from "@prisma/client";

const READING_GRACE_MS = 5 * 60 * 1000;

export type ReaderSessionAccessState =
  | { allowed: true; mode: "ACTIVE" }
  | { allowed: true; mode: "GRACE"; graceEndsAt: Date; remainingMs: number }
  | { allowed: false; reason: "NOT_FOUND" | "INACTIVE" | "EXPIRED"; graceEndsAt?: Date | null };

function isActiveGrant(grant: { status: AccessGrantStatus; startsAt: Date; expiresAt: Date | null }, now: Date) {
  if (grant.status !== AccessGrantStatus.ACTIVE) {
    return false;
  }

  if (grant.startsAt > now) {
    return false;
  }

  return grant.expiresAt === null || grant.expiresAt > now;
}

export async function ensureReadingSessionForActiveGrant(
  tx: Prisma.TransactionClient,
  input: {
    accessGrantId: string;
    userId: string;
    bookId: string;
    now: Date;
    locator?: string | null;
  },
) {
  return tx.readingSession.upsert({
    where: {
      accessGrantId_userId: {
        accessGrantId: input.accessGrantId,
        userId: input.userId,
      },
    },
    create: {
      accessGrantId: input.accessGrantId,
      userId: input.userId,
      bookId: input.bookId,
      openedAt: input.now,
      lastSeenAt: input.now,
      lastLocator: input.locator?.trim() ? input.locator.trim() : null,
    },
    update: {
      closedAt: null,
      lastSeenAt: input.now,
      lastLocator: input.locator?.trim() ? input.locator.trim() : undefined,
    },
    select: {
      id: true,
      graceEndsAt: true,
      closedAt: true,
    },
  });
}

export async function touchReadingSession(
  tx: Prisma.TransactionClient,
  input: {
    accessGrantId: string;
    userId: string;
    now: Date;
    locator?: string | null;
  },
) {
  await tx.readingSession.updateMany({
    where: {
      accessGrantId: input.accessGrantId,
      userId: input.userId,
      closedAt: null,
    },
    data: {
      lastSeenAt: input.now,
      lastLocator: input.locator?.trim() ? input.locator.trim() : undefined,
    },
  });
}

export async function closeReadingSession(
  tx: Prisma.TransactionClient,
  input: {
    accessGrantId: string;
    userId: string;
    now: Date;
    locator?: string | null;
  },
) {
  await tx.readingSession.updateMany({
    where: {
      accessGrantId: input.accessGrantId,
      userId: input.userId,
      closedAt: null,
    },
    data: {
      closedAt: input.now,
      lastSeenAt: input.now,
      lastLocator: input.locator?.trim() ? input.locator.trim() : undefined,
    },
  });
}

export async function resolveReaderSessionAccess(
  tx: Prisma.TransactionClient,
  input: {
    accessGrantId: string;
    userId: string;
    now: Date;
    requiredSessionId?: string;
  },
): Promise<ReaderSessionAccessState> {
  const grant = await tx.accessGrant.findFirst({
    where: {
      id: input.accessGrantId,
      userId: input.userId,
    },
    select: {
      id: true,
      type: true,
      status: true,
      startsAt: true,
      expiresAt: true,
    },
  });

  if (!grant) {
    return { allowed: false, reason: "NOT_FOUND" };
  }

  if (isActiveGrant(grant, input.now)) {
    return { allowed: true, mode: "ACTIVE" };
  }

  if (grant.type !== AccessGrantType.RENTAL || !grant.expiresAt || grant.status !== AccessGrantStatus.ACTIVE) {
    return { allowed: false, reason: "INACTIVE" };
  }

  const session = await tx.readingSession.findFirst({
    where: {
      id: input.requiredSessionId,
      accessGrantId: grant.id,
      userId: input.userId,
      closedAt: null,
      openedAt: { lt: grant.expiresAt },
    },
    orderBy: {
      openedAt: "asc",
    },
    select: {
      id: true,
      graceEndsAt: true,
    },
  });

  if (!session) {
    return { allowed: false, reason: "EXPIRED" };
  }

  const computedGraceEndsAt = session.graceEndsAt ?? new Date(grant.expiresAt.getTime() + READING_GRACE_MS);

  if (!session.graceEndsAt) {
    await tx.readingSession.update({
      where: { id: session.id },
      data: {
        graceEndsAt: computedGraceEndsAt,
      },
    });
  }

  const remainingMs = computedGraceEndsAt.getTime() - input.now.getTime();

  if (remainingMs <= 0) {
    await tx.readingSession.update({
      where: { id: session.id },
      data: {
        closedAt: input.now,
        lastSeenAt: input.now,
      },
    });
    return { allowed: false, reason: "EXPIRED", graceEndsAt: computedGraceEndsAt };
  }

  return {
    allowed: true,
    mode: "GRACE",
    graceEndsAt: computedGraceEndsAt,
    remainingMs,
  };
}
