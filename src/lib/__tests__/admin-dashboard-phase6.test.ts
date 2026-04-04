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
  });

  assert.equal(snapshot.metrics.usersCount, counts.users);
  assert.equal(snapshot.metrics.bannedUsersCount, counts.banned);
  assert.equal(snapshot.metrics.pendingBooksCount, counts.pendingBooks);
  assert.equal(snapshot.alerts.failedOrStuckPayments, counts.issues);
  assert.equal(snapshot.alerts.suspiciousDeviceAttemptsToday, counts.suspicious);
  assert.equal(snapshot.metrics.auditLogsTodayCount, counts.auditsToday);
  assert.equal(snapshot.recentAdminActions.length, 1);
  assert.equal(snapshot.recentAdminActions[0]?.actorEmail, "admin@example.com");
});

test("suspicious event helper isolates risky security events", () => {
  assert.equal(isSuspiciousSecurityEvent("SUSPICIOUS_ACCOUNT_ACTIVITY"), true);
  assert.equal(isSuspiciousSecurityEvent("TRUSTED_DEVICE_REGISTERED"), false);
});
