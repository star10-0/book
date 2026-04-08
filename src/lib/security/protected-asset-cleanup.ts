import "server-only";

const DEFAULT_BATCH_LIMIT = 500;
const DEFAULT_REDEEMED_RETENTION_MINUTES = 15;

type ProtectedAssetCleanupDb = {
  protectedAssetHandoffTicket: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: { id: true };
      orderBy: { createdAt: "asc" };
      take: number;
    }) => Promise<Array<{ id: string }>>;
    deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<{ count: number }>;
  };
  protectedAssetSession: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: { id: true };
      orderBy: { createdAt: "asc" };
      take: number;
    }) => Promise<Array<{ id: string }>>;
    deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<{ count: number }>;
  };
  $transaction: <T>(input: Promise<T>[]) => Promise<T[]>;
};

export type ProtectedAssetCleanupSummary = {
  expiredUnredeemedHandoffDeleted: number;
  redeemedHandoffDeleted: number;
  expiredSessionDeleted: number;
};

export async function cleanupProtectedAssetArtifacts(
  db: ProtectedAssetCleanupDb,
  options?: {
    now?: Date;
    batchLimit?: number;
    redeemedRetentionMinutes?: number;
  },
): Promise<ProtectedAssetCleanupSummary> {
  const now = options?.now ?? new Date();
  const batchLimit = Math.max(1, Math.min(2000, options?.batchLimit ?? DEFAULT_BATCH_LIMIT));
  const redeemedRetentionMinutes = Math.max(1, Math.min(24 * 60, options?.redeemedRetentionMinutes ?? DEFAULT_REDEEMED_RETENTION_MINUTES));
  const redeemedCutoff = new Date(now.getTime() - redeemedRetentionMinutes * 60_000);

  const [expiredUnredeemedHandoff, redeemedOldHandoff, expiredSessions] = await db.$transaction([
    db.protectedAssetHandoffTicket.findMany({
      where: {
        redeemedAt: null,
        expiresAt: { lt: now },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: batchLimit,
    }),
    db.protectedAssetHandoffTicket.findMany({
      where: {
        redeemedAt: { lt: redeemedCutoff },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: batchLimit,
    }),
    db.protectedAssetSession.findMany({
      where: {
        expiresAt: { lt: now },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: batchLimit,
    }),
  ]);

  const [expiredUnredeemedHandoffDeleted, redeemedHandoffDeleted, expiredSessionDeleted] = await db.$transaction([
    expiredUnredeemedHandoff.length
      ? db.protectedAssetHandoffTicket.deleteMany({ where: { id: { in: expiredUnredeemedHandoff.map((entry) => entry.id) } } })
      : Promise.resolve({ count: 0 }),
    redeemedOldHandoff.length
      ? db.protectedAssetHandoffTicket.deleteMany({ where: { id: { in: redeemedOldHandoff.map((entry) => entry.id) } } })
      : Promise.resolve({ count: 0 }),
    expiredSessions.length
      ? db.protectedAssetSession.deleteMany({ where: { id: { in: expiredSessions.map((entry) => entry.id) } } })
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    expiredUnredeemedHandoffDeleted: expiredUnredeemedHandoffDeleted.count,
    redeemedHandoffDeleted: redeemedHandoffDeleted.count,
    expiredSessionDeleted: expiredSessionDeleted.count,
  };
}
