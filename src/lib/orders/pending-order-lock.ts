import { createHash } from "node:crypto";

export function buildPendingOrderAdvisoryLockKeys(input: { userId: string; offerId: string }): [number, number] {
  const digest = createHash("sha256").update(`pending-order:${input.userId}:${input.offerId}`).digest();
  return [digest.readInt32BE(0), digest.readInt32BE(4)];
}
