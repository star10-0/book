import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@book.local";
const DEMO_USER_FULL_NAME = "قارئ تجريبي";

/**
 * Temporary helper until real authentication is integrated.
 * TODO(auth): Replace this function with session-derived user resolution.
 */
export async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {
      fullName: DEMO_USER_FULL_NAME,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    create: {
      email: DEMO_USER_EMAIL,
      fullName: DEMO_USER_FULL_NAME,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });
}
