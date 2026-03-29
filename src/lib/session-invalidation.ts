import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-password";

export async function invalidateUserSessions(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
    select: { id: true },
  });
}

export async function updatePasswordAndInvalidateSessions(userId: string, nextPassword: string) {
  const passwordHash = await hashPassword(nextPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      sessionVersion: {
        increment: 1,
      },
    },
    select: { id: true },
  });
}
