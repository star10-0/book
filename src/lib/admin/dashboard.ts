import { BookStatus, PaymentAttemptStatus, Prisma } from "@prisma/client";
import { suspiciousSecurityEventTypes } from "@/lib/admin/security-signals";
import { prisma } from "@/lib/prisma";
import { getOrderIntegritySnapshot } from "@/lib/admin/order-integrity";
import { getQueueAlertSummary, loadOperationalReviewQueues, type ReviewQueuesSnapshot } from "@/lib/admin/review-queues";
import { getSystemHealthSnapshot, type SystemHealthSnapshot } from "@/lib/admin/system-health";

export type DashboardSnapshot = {
  metrics: {
    usersCount: number;
    bannedUsersCount: number;
    booksCount: number;
    pendingBooksCount: number;
    publishedBooksCount: number;
    todayOrdersCount: number;
    todayPaymentsCount: number;
    needsReviewPaymentsCount: number;
    failedOrStuckPaymentsCount: number;
    suspiciousEventsTodayCount: number;
    auditLogsTodayCount: number;
    integrityWarningsCount: number;
  };
  alerts: {
    paymentsNeedingReview: number;
    failedOrStuckPayments: number;
    suspiciousDeviceAttemptsToday: number;
    pendingBooksReview: number;
    integrityWarnings: number;
    criticalPaymentsNeedingReview: number;
    suspiciousAccountsOrDevices: number;
    integrityAnomalies: number;
    criticalRiskSignals: number;
  };
  recentAdminActions: Array<{
    id: string;
    action: string;
    createdAt: Date;
    actorEmail: string;
    reason: string | null;
  }>;
  recentSecurityActions: Array<{
    id: string;
    type: string;
    createdAt: Date;
    userId: string;
  }>;
  reviewQueues: ReviewQueuesSnapshot;
  systemHealth: SystemHealthSnapshot;
};

type DashboardDeps = {
  userCount: (args?: Prisma.UserCountArgs) => Promise<number>;
  bookCount: (args?: Prisma.BookCountArgs) => Promise<number>;
  orderCount: (args?: Prisma.OrderCountArgs) => Promise<number>;
  paymentAttemptCount: (args?: Prisma.PaymentAttemptCountArgs) => Promise<number>;
  userSecurityEventCount: (args?: Prisma.UserSecurityEventCountArgs) => Promise<number>;
  adminAuditCount: (args?: Prisma.AdminAuditLogCountArgs) => Promise<number>;
  adminAuditFindMany: (args: Prisma.AdminAuditLogFindManyArgs) => Promise<Array<{
    id: string;
    action: string;
    reason: string | null;
    createdAt: Date;
    actorAdmin?: { email: string } | null;
  }>>;
  securityEventsFindMany: (args: Prisma.UserSecurityEventFindManyArgs) => Promise<Array<{
    id: string;
    type: string;
    userId: string;
    createdAt: Date;
  }>>;
  integrityWarningsCount: () => Promise<number>;
  reviewQueuesLoader: (now: Date) => Promise<ReviewQueuesSnapshot>;
  systemHealthLoader: (now: Date) => Promise<SystemHealthSnapshot>;
};

const defaultDeps: DashboardDeps = {
  userCount: (args) => prisma.user.count(args),
  bookCount: (args) => prisma.book.count(args),
  orderCount: (args) => prisma.order.count(args),
  paymentAttemptCount: (args) => prisma.paymentAttempt.count(args),
  userSecurityEventCount: (args) => prisma.userSecurityEvent.count(args),
  adminAuditCount: (args) => prisma.adminAuditLog.count(args),
  adminAuditFindMany: async (args) => {
    const rows = await prisma.adminAuditLog.findMany(args);
    return rows as Array<{
      id: string;
      action: string;
      reason: string | null;
      createdAt: Date;
      actorAdmin?: { email: string } | null;
    }>;
  },
  securityEventsFindMany: (args) => prisma.userSecurityEvent.findMany(args),
  integrityWarningsCount: async () => {
    const snapshot = await getOrderIntegritySnapshot(1);
    return Object.values(snapshot.totals).reduce((sum, value) => sum + value, 0);
  },
  reviewQueuesLoader: (now) => loadOperationalReviewQueues(now),
  systemHealthLoader: (now) => getSystemHealthSnapshot(now),
};

export async function loadAdminDashboardSnapshot(now = new Date(), deps: DashboardDeps = defaultDeps): Promise<DashboardSnapshot> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    usersCount,
    bannedUsersCount,
    booksCount,
    pendingBooksCount,
    publishedBooksCount,
    todayOrdersCount,
    todayPaymentsCount,
    needsReviewPaymentsCount,
    failedOrStuckPaymentsCount,
    suspiciousEventsTodayCount,
    auditLogsTodayCount,
    recentAdminActions,
    recentSecurityActions,
    integrityWarningsCount,
    reviewQueues,
    systemHealth,
  ] = await Promise.all([
    deps.userCount(),
    deps.userCount({ where: { isActive: false } }),
    deps.bookCount(),
    deps.bookCount({ where: { status: BookStatus.PENDING_REVIEW } }),
    deps.bookCount({ where: { status: BookStatus.PUBLISHED } }),
    deps.orderCount({ where: { createdAt: { gte: startOfToday } } }),
    deps.paymentAttemptCount({ where: { createdAt: { gte: startOfToday } } }),
    deps.paymentAttemptCount({
      where: {
        status: {
          in: [PaymentAttemptStatus.PENDING, PaymentAttemptStatus.SUBMITTED, PaymentAttemptStatus.VERIFYING],
        },
      },
    }),
    deps.paymentAttemptCount({
      where: {
        OR: [
          { status: PaymentAttemptStatus.FAILED },
          {
            status: PaymentAttemptStatus.VERIFYING,
            updatedAt: { lt: new Date(now.getTime() - 1000 * 60 * 20) },
          },
        ],
      },
    }),
    deps.userSecurityEventCount({
      where: {
        createdAt: { gte: startOfToday },
        type: { in: suspiciousSecurityEventTypes },
      },
    }),
    deps.adminAuditCount({ where: { createdAt: { gte: startOfToday } } }),
    deps.adminAuditFindMany({
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
        actorAdmin: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    deps.securityEventsFindMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        type: {
          in: suspiciousSecurityEventTypes,
        },
      },
      select: {
        id: true,
        type: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    deps.integrityWarningsCount(),
    deps.reviewQueuesLoader(now),
    deps.systemHealthLoader(now),
  ]);

  const queueAlerts = getQueueAlertSummary(reviewQueues);

  return {
    metrics: {
      usersCount,
      bannedUsersCount,
      booksCount,
      pendingBooksCount,
      publishedBooksCount,
      todayOrdersCount,
      todayPaymentsCount,
      needsReviewPaymentsCount,
      failedOrStuckPaymentsCount,
      suspiciousEventsTodayCount,
      auditLogsTodayCount,
      integrityWarningsCount,
    },
    alerts: {
      paymentsNeedingReview: needsReviewPaymentsCount,
      failedOrStuckPayments: failedOrStuckPaymentsCount,
      suspiciousDeviceAttemptsToday: suspiciousEventsTodayCount,
      pendingBooksReview: pendingBooksCount,
      integrityWarnings: integrityWarningsCount,
      criticalPaymentsNeedingReview: queueAlerts.criticalPaymentsNeedingReview,
      suspiciousAccountsOrDevices: queueAlerts.suspiciousAccountsOrDevices,
      integrityAnomalies: queueAlerts.integrityAnomalies,
      criticalRiskSignals: queueAlerts.criticalRiskSignals,
    },
    recentAdminActions: recentAdminActions.map((item) => ({
      id: item.id,
      action: item.action,
      createdAt: item.createdAt,
      actorEmail: item.actorAdmin?.email ?? "—",
      reason: item.reason,
    })),
    recentSecurityActions: recentSecurityActions.map((item) => ({
      id: item.id,
      type: item.type,
      userId: item.userId,
      createdAt: item.createdAt,
    })),
    reviewQueues,
    systemHealth,
  };
}
