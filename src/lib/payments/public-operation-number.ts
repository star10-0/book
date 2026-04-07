import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const OPERATION_NUMBER_PREFIX = "OP-";
const OPERATION_NUMBER_LENGTH = 12;

export function toPublicOperationNumber(attemptId: string): string {
  const normalized = attemptId.trim();
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `${OPERATION_NUMBER_PREFIX}${digest.slice(0, OPERATION_NUMBER_LENGTH).toUpperCase()}`;
}

export async function resolveAttemptIdFromOperationNumber(input: { userId: string; operationNumber: string }): Promise<string | null> {
  const normalizedOperationNumber = input.operationNumber.trim().toUpperCase();
  if (!normalizedOperationNumber.startsWith(OPERATION_NUMBER_PREFIX)) {
    return null;
  }

  const attempts = await prisma.paymentAttempt.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true },
  });

  const match = attempts.find((attempt) => toPublicOperationNumber(attempt.id) === normalizedOperationNumber);
  return match?.id ?? null;
}
