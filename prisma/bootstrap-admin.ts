import { AdminScope, PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/lib/auth-password';

const prisma = new PrismaClient();

const requiredEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const bootstrapAdmin = async () => {
  const email = requiredEnv('INITIAL_ADMIN_EMAIL').toLowerCase();
  const password = requiredEnv('INITIAL_ADMIN_PASSWORD');
  const fullName = process.env.INITIAL_ADMIN_FULL_NAME?.trim() || 'Platform Admin';

  if (password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
    select: { id: true, email: true },
  });

  if (existingAdmin) {
    throw new Error(
      `Admin bootstrap aborted: an admin already exists (${existingAdmin.email}).`,
    );
  }

  const passwordHash = await hashPassword(password);
  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role: UserRole.ADMIN,
      adminScopes: [AdminScope.SUPER_ADMIN],
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      fullName,
      role: UserRole.ADMIN,
      adminScopes: [AdminScope.SUPER_ADMIN],
      isActive: true,
      passwordHash,
    },
  });

  console.log(`Initial admin created: ${adminUser.email}`);
};

bootstrapAdmin()
  .catch((error) => {
    console.error('Initial admin bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
