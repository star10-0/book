import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-password';

const prisma = new PrismaClient();

const requiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const resetAdminPassword = async () => {
  const email = requiredEnv('ADMIN_RESET_EMAIL').toLowerCase();
  const password = requiredEnv('ADMIN_RESET_PASSWORD');

  if (password.length < 12) {
    throw new Error('ADMIN_RESET_PASSWORD must be at least 12 characters long.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!existingUser) {
    throw new Error(`Admin password reset failed: user not found for email ${email}.`);
  }

  if (existingUser.role !== UserRole.ADMIN) {
    throw new Error(
      `Admin password reset failed: ${email} is ${existingUser.role}, expected ADMIN.`,
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      passwordHash,
      sessionVersion: {
        increment: 1,
      },
    },
    select: { id: true },
  });

  console.log(`Admin password reset complete for: ${existingUser.email}`);
};

resetAdminPassword()
  .catch((error) => {
    console.error('Admin password reset failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
