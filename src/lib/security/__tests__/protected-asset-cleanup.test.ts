import assert from "node:assert/strict";
import test from "node:test";
import { cleanupProtectedAssetArtifacts } from "@/lib/security/protected-asset-cleanup";

test("cleanupProtectedAssetArtifacts deletes only expired/unredeemed or old redeemed/expired session rows", async () => {
  const calls: Array<{ model: string; where: Record<string, unknown> }> = [];

  const db = {
    protectedAssetHandoffTicket: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        calls.push({ model: "handoff.findMany", where });
        if ("redeemedAt" in where && (where.redeemedAt as null | Record<string, Date>) === null) {
          return [{ id: "h-expired-unredeemed" }];
        }
        return [{ id: "h-redeemed-old" }];
      },
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        calls.push({ model: "handoff.deleteMany", where });
        return { count: where.id.in.length };
      },
    },
    protectedAssetSession: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        calls.push({ model: "session.findMany", where });
        return [{ id: "s-expired" }];
      },
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        calls.push({ model: "session.deleteMany", where });
        return { count: where.id.in.length };
      },
    },
    $transaction: async <T>(input: Promise<T>[]) => Promise.all(input),
  };

  const result = await cleanupProtectedAssetArtifacts(db, {
    now: new Date("2026-04-08T00:00:00.000Z"),
    batchLimit: 50,
    redeemedRetentionMinutes: 10,
  });

  assert.deepEqual(result, {
    expiredUnredeemedHandoffDeleted: 1,
    redeemedHandoffDeleted: 1,
    expiredSessionDeleted: 1,
  });

  const deleteCalls = calls.filter((entry) => entry.model.endsWith("deleteMany"));
  assert.equal(deleteCalls.length, 3);
  assert.deepEqual(deleteCalls[0]?.where, { id: { in: ["h-expired-unredeemed"] } });
  assert.deepEqual(deleteCalls[1]?.where, { id: { in: ["h-redeemed-old"] } });
  assert.deepEqual(deleteCalls[2]?.where, { id: { in: ["s-expired"] } });
});

test("cleanupProtectedAssetArtifacts uses bounded limits", async () => {
  const seenTake: number[] = [];

  const db = {
    protectedAssetHandoffTicket: {
      findMany: async ({ take }: { take: number }) => {
        seenTake.push(take);
        return [];
      },
      deleteMany: async () => ({ count: 0 }),
    },
    protectedAssetSession: {
      findMany: async ({ take }: { take: number }) => {
        seenTake.push(take);
        return [];
      },
      deleteMany: async () => ({ count: 0 }),
    },
    $transaction: async <T>(input: Promise<T>[]) => Promise.all(input),
  };

  await cleanupProtectedAssetArtifacts(db, { batchLimit: 999999 });

  assert.equal(seenTake.every((value) => value <= 2000), true);
});
