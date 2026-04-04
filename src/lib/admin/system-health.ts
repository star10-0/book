import { PaymentAttemptStatus, PaymentProvider } from "@prisma/client";
import { validateServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getOrderIntegritySnapshot } from "@/lib/admin/order-integrity";
import { suspiciousSecurityEventTypes } from "@/lib/admin/security-signals";
import { getProviderIntegrationConfig } from "@/lib/payments/gateways/provider-integration";

export type SystemHealthSnapshot = {
  generatedAt: Date;
  env: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
  };
  providers: Array<{
    provider: PaymentProvider;
    mode: "mock" | "live";
    ready: boolean;
    missingEnvKeys: string[];
  }>;
  criticalFailures: {
    failedPaymentsLast24h: number;
    stuckVerifyingLast24h: number;
    suspiciousSecurityEventsLast24h: number;
  };
  areas: {
    paymentsHealthy: boolean;
    usersHealthy: boolean;
    ordersHealthy: boolean;
    contentHealthy: boolean;
  };
  drift: {
    prismaMigrationsHealthy: boolean;
    pendingOrFailedMigrations: number;
  };
};

async function getPendingOrFailedMigrationsCount() {
  try {
    const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "_prisma_migrations"
      WHERE ("finished_at" IS NULL OR "rolled_back_at" IS NOT NULL)
    `;

    const value = rows[0]?.count;
    return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
  } catch {
    return 0;
  }
}

export async function getSystemHealthSnapshot(now = new Date()): Promise<SystemHealthSnapshot> {
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const env = validateServerEnv();

  const [failedPaymentsLast24h, stuckVerifyingLast24h, suspiciousSecurityEventsLast24h, integrity, pendingOrFailedMigrations, pendingBooks] = await Promise.all([
    prisma.paymentAttempt.count({ where: { status: PaymentAttemptStatus.FAILED, createdAt: { gte: last24h } } }),
    prisma.paymentAttempt.count({
      where: {
        status: PaymentAttemptStatus.VERIFYING,
        updatedAt: { lt: new Date(now.getTime() - 20 * 60 * 1000) },
      },
    }),
    prisma.userSecurityEvent.count({
      where: {
        createdAt: { gte: last24h },
        type: { in: suspiciousSecurityEventTypes },
      },
    }),
    getOrderIntegritySnapshot(5),
    getPendingOrFailedMigrationsCount(),
    prisma.book.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  const providers = (["SHAM_CASH", "SYRIATEL_CASH"] as const)
    .map((provider) => ({ provider, config: getProviderIntegrationConfig(provider) }))
    .filter((item) => Boolean(item.config))
    .map((item) => ({
      provider: item.provider,
      mode: item.config!.mode,
      ready: item.config!.mode === "mock" || item.config!.isLiveConfigured,
      missingEnvKeys: item.config!.missingEnvKeys,
    }));

  const integrityWarnings = Object.values(integrity.totals).reduce((sum, value) => sum + value, 0);

  return {
    generatedAt: now,
    env: {
      valid: env.isValid,
      errorCount: env.errors.length,
      warningCount: env.warnings.length,
    },
    providers,
    criticalFailures: {
      failedPaymentsLast24h,
      stuckVerifyingLast24h,
      suspiciousSecurityEventsLast24h,
    },
    areas: {
      paymentsHealthy: failedPaymentsLast24h < 15 && stuckVerifyingLast24h < 10,
      usersHealthy: suspiciousSecurityEventsLast24h < 25,
      ordersHealthy: integrityWarnings < 20,
      contentHealthy: pendingBooks < 100,
    },
    drift: {
      prismaMigrationsHealthy: pendingOrFailedMigrations === 0,
      pendingOrFailedMigrations,
    },
  };
}
