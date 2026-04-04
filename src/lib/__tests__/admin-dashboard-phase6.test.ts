import assert from "node:assert/strict";
import test from "node:test";
import { loadAdminDashboardSnapshot } from "@/lib/admin/dashboard";
import { isSuspiciousSecurityEvent } from "@/lib/admin/security-signals";

test("loadAdminDashboardSnapshot aggregates KPI and alerts from deps", async () => {
  const counts: Record<string, number> = {
    users: 120,
    banned: 7,
    books: 41,
    pendingBooks: 3,
    published: 24,
    todayOrders: 12,
    todayPayments: 9,
    needsReview: 5,
    issues: 2,
    suspicious: 6,
    auditsToday: 14,
  };

  const snapshot = await loadAdminDashboardSnapshot(new Date("2026-04-04T10:00:00.000Z"), {
    userCount: async (args) => (args?.where && "isActive" in args.where ? counts.banned : counts.users),
    bookCount: async (args) => {
      if (!args?.where) return counts.books;
      if (args.where.status === "PENDING_REVIEW") return counts.pendingBooks;
      return counts.published;
    },
    orderCount: async () => counts.todayOrders,
    paymentAttemptCount: async (args) => {
      const whereText = JSON.stringify(args?.where ?? {});
      if (whereText.includes("updatedAt") || whereText.includes("FAILED")) {
        return counts.issues;
      }
      if (whereText.includes("SUBMITTED") || whereText.includes("PENDING") || whereText.includes("VERIFYING")) {
        return counts.needsReview;
      }
      return counts.todayPayments;
    },
    userSecurityEventCount: async () => counts.suspicious,
    adminAuditCount: async () => counts.auditsToday,
    adminAuditFindMany: async () => [
      {
        id: "audit_1",
        action: "PAYMENT_RETRY_VERIFY",
        reason: "manual check",
        createdAt: new Date("2026-04-04T09:50:00.000Z"),
        actorAdmin: { email: "admin@example.com" },
      },
    ],
    securityEventsFindMany: async () => [
      {
        id: "sec_1",
        type: "SUSPICIOUS_ACCOUNT_ACTIVITY",
        userId: "user_1",
        createdAt: new Date("2026-04-04T09:00:00.000Z"),
      },
    ],
    integrityWarningsCount: async () => 4,
    reviewQueuesLoader: async () => ({
      paymentRecoveryQueue: [{ id: "p1", label: "p1", reason: "failed", recommendedAction: "recover" }],
      suspiciousUsersQueue: [{ id: "u1", label: "u1", reason: "signals", recommendedAction: "restrict" }],
      suspiciousDeviceAttemptsQueue: [{ id: "d1", label: "1.2.3.4", reason: "blocked", recommendedAction: "verify" }],
      ordersRequiringInterventionQueue: [{ id: "o1", label: "o1", reason: "integrity", recommendedAction: "repair" }],
      risk: {
        severity: { info: 0, warning: 1, critical: 1 },
        signals: [],
      },
    }),
    systemHealthLoader: async () => ({
      generatedAt: new Date("2026-04-04T10:00:00.000Z"),
      env: { valid: true, errorCount: 0, warningCount: 1 },
      providers: [{ provider: "SHAM_CASH", mode: "mock", ready: true, missingEnvKeys: [] }],
      criticalFailures: { failedPaymentsLast24h: 2, stuckVerifyingLast24h: 1, suspiciousSecurityEventsLast24h: 3 },
      areas: { paymentsHealthy: true, usersHealthy: true, ordersHealthy: true, contentHealthy: true },
      drift: { prismaMigrationsHealthy: true, pendingOrFailedMigrations: 0 },
    }),
  });

  assert.equal(snapshot.metrics.usersCount, counts.users);
  assert.equal(snapshot.metrics.bannedUsersCount, counts.banned);
  assert.equal(snapshot.metrics.pendingBooksCount, counts.pendingBooks);
  assert.equal(snapshot.alerts.failedOrStuckPayments, counts.issues);
  assert.equal(snapshot.alerts.suspiciousDeviceAttemptsToday, counts.suspicious);
  assert.equal(snapshot.metrics.auditLogsTodayCount, counts.auditsToday);
  assert.equal(snapshot.recentAdminActions.length, 1);
  assert.equal(snapshot.alerts.integrityWarnings, 4);
  assert.equal(snapshot.recentAdminActions[0]?.actorEmail, "admin@example.com");
  assert.equal(snapshot.alerts.criticalPaymentsNeedingReview, 1);
  assert.equal(snapshot.alerts.suspiciousAccountsOrDevices, 2);
  assert.equal(snapshot.alerts.integrityAnomalies, 1);
  assert.equal(snapshot.alerts.criticalRiskSignals, 1);
  assert.equal(snapshot.recentSecurityActions.length, 1);
  assert.equal(snapshot.systemHealth.env.valid, true);
});

test("suspicious event helper isolates risky security events", () => {
  assert.equal(isSuspiciousSecurityEvent("SUSPICIOUS_ACCOUNT_ACTIVITY"), true);
  assert.equal(isSuspiciousSecurityEvent("TRUSTED_DEVICE_REGISTERED"), false);
});
