import { PaymentAttemptStatus, PaymentProvider, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrderIntegritySnapshot } from "@/lib/admin/order-integrity";
import { buildRiskSignals, summarizeRiskSeverity } from "@/lib/admin/risk-engine";

const SECURITY_EVENT_TYPES = {
  blockedDevice: "LOGIN_BLOCKED_UNTRUSTED_DEVICE",
  multiDevice: "CONTENT_ACCESS_MULTIPLE_DEVICE_ANOMALY",
  suspiciousActivity: "SUSPICIOUS_ACCOUNT_ACTIVITY",
} as const;

const TRACKED_SECURITY_EVENTS = [
  SECURITY_EVENT_TYPES.blockedDevice,
  SECURITY_EVENT_TYPES.multiDevice,
  SECURITY_EVENT_TYPES.suspiciousActivity,
] as const;

export type ReviewQueueItem = {
  id: string;
  label: string;
  reason: string;
  recommendedAction: string;
};

export type ReviewQueuesSnapshot = {
  paymentRecoveryQueue: ReviewQueueItem[];
  suspiciousUsersQueue: ReviewQueueItem[];
  suspiciousDeviceAttemptsQueue: ReviewQueueItem[];
  ordersRequiringInterventionQueue: ReviewQueueItem[];
  risk: {
    severity: ReturnType<typeof summarizeRiskSeverity>;
    signals: ReturnType<typeof buildRiskSignals>;
  };
};

type ReviewQueueDeps = {
  paymentAttemptsFindMany: (args: Prisma.PaymentAttemptFindManyArgs) => Promise<Array<{
    id: string;
    userId: string;
    status: PaymentAttemptStatus;
    failureReason: string | null;
    provider: PaymentProvider;
    requestPayload: Prisma.JsonValue | null;
  }>>;
  securityEventsFindMany: (args: Prisma.UserSecurityEventFindManyArgs) => Promise<Array<{
    id: string;
    userId: string;
    type: string;
    ipAddress: string | null;
    metadata: Prisma.JsonValue | null;
  }>>;
  usersFindMany: (args: Prisma.UserFindManyArgs) => Promise<Array<{
    id: string;
    email: string;
    role: UserRole;
    requirePasswordReset: boolean;
    _count: { securityEvents: number };
  }>>;
  adminAuditCount: (args?: Prisma.AdminAuditLogCountArgs) => Promise<number>;
  orderIntegritySnapshot: () => Promise<Awaited<ReturnType<typeof getOrderIntegritySnapshot>>>;
};

const defaultDeps: ReviewQueueDeps = {
  paymentAttemptsFindMany: (args) => prisma.paymentAttempt.findMany(args),
  securityEventsFindMany: (args) => prisma.userSecurityEvent.findMany(args),
  usersFindMany: async (args) => {
    const rows = await prisma.user.findMany(args as Prisma.UserFindManyArgs);
    return rows as unknown as Array<{
      id: string;
      email: string;
      role: UserRole;
      requirePasswordReset: boolean;
      _count: { securityEvents: number };
    }>;
  },
  adminAuditCount: (args) => prisma.adminAuditLog.count(args),
  orderIntegritySnapshot: () => getOrderIntegritySnapshot(25),
};

export async function loadOperationalReviewQueues(now = new Date(), deps: ReviewQueueDeps = defaultDeps): Promise<ReviewQueuesSnapshot> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [paymentAttempts, securityEvents, suspiciousUsers, abnormalManualPaymentActions, integrity] = await Promise.all([
    deps.paymentAttemptsFindMany({
      where: {
        OR: [
          { status: PaymentAttemptStatus.FAILED },
          { status: PaymentAttemptStatus.VERIFYING, updatedAt: { lt: new Date(now.getTime() - 20 * 60 * 1000) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        userId: true,
        status: true,
        failureReason: true,
        provider: true,
        requestPayload: true,
      },
    }),
    deps.securityEventsFindMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        type: { in: [...TRACKED_SECURITY_EVENTS] },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        userId: true,
        type: true,
        ipAddress: true,
        metadata: true,
      },
    }),
    deps.usersFindMany({
      where: {
        securityEvents: {
          some: {
            createdAt: { gte: sevenDaysAgo },
            type: { in: [...TRACKED_SECURITY_EVENTS] },
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        requirePasswordReset: true,
        _count: {
          select: {
            securityEvents: {
              where: {
                createdAt: { gte: sevenDaysAgo },
                type: { in: [...TRACKED_SECURITY_EVENTS] },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    deps.adminAuditCount({
      where: {
        createdAt: { gte: sevenDaysAgo },
        action: {
          in: ["PAYMENT_FORCE_GRANT_ACCESS", "PAYMENT_RECONCILE_BY_TX"],
        },
      },
    }),
    deps.orderIntegritySnapshot(),
  ]);

  const failedByUser = paymentAttempts.reduce<Map<string, number>>((acc, attempt) => {
    if (attempt.status !== PaymentAttemptStatus.FAILED) return acc;
    acc.set(attempt.userId, (acc.get(attempt.userId) ?? 0) + 1);
    return acc;
  }, new Map());

  const repeatedPaymentVerificationFailures = Array.from(failedByUser.values()).filter((count) => count >= 3).length;

  const protectedBlockedAttempts = securityEvents.filter(
    (event) =>
      event.type === SECURITY_EVENT_TYPES.blockedDevice &&
      suspiciousUsers.some((user) => user.id === event.userId && (user.role === UserRole.ADMIN || user.requirePasswordReset)),
  ).length;

  const multiDeviceSignals = securityEvents.filter((event) => event.type === SECURITY_EVENT_TYPES.multiDevice).length;

  const repeatedBlockedSignals = securityEvents.filter((event) => {
    if (event.type !== SECURITY_EVENT_TYPES.suspiciousActivity) return false;
    const metadata = event.metadata as Record<string, unknown> | null;
    return metadata?.signal === "repeated_blocked_device_attempts";
  }).length;

  const signals = buildRiskSignals(
    {
      newDeviceAttemptsOnProtectedAccounts: protectedBlockedAttempts,
      repeatedBlockedDeviceLogins: repeatedBlockedSignals,
      suspiciousMultiDevicePatterns: multiDeviceSignals,
      repeatedPaymentVerificationFailures,
      txConflictsOrAbnormalManualPaymentBehavior: abnormalManualPaymentActions,
    },
    now,
  );

  return {
    paymentRecoveryQueue: paymentAttempts.map((attempt) => ({
      id: attempt.id,
      label: `محاولة ${attempt.id}`,
      reason: attempt.failureReason || (attempt.status === "VERIFYING" ? "محاولة عالقة في التحقق" : "محاولة فاشلة"),
      recommendedAction: attempt.status === "VERIFYING" ? "نفّذ استرداد محاولة أو حرّر القفل بعد التحقق." : "أعد التحقق من المرجع وراجع إثبات الدفع.",
    })),
    suspiciousUsersQueue: suspiciousUsers
      .filter((user) => user._count.securityEvents >= 2)
      .map((user) => ({
        id: user.id,
        label: user.email,
        reason: `${user._count.securityEvents.toLocaleString("ar-SY")} مؤشر أمني خلال 7 أيام`,
        recommendedAction: "افتح ملف المستخدم، راجع الأجهزة الموثوقة، وقيّد الجلسات عند الحاجة.",
      })),
    suspiciousDeviceAttemptsQueue: securityEvents
      .filter((event) => event.type === SECURITY_EVENT_TYPES.blockedDevice && event.ipAddress)
      .slice(0, 50)
      .map((event) => ({
        id: event.id,
        label: event.ipAddress || "unknown-ip",
        reason: `محاولة جهاز غير موثوق للحساب ${event.userId}`,
        recommendedAction: "تأكد من هوية المستخدم ثم أعد ربط الجهاز أو فعّل إعادة تعيين كلمة المرور.",
      })),
    ordersRequiringInterventionQueue: integrity.anomalies.slice(0, 50).map((anomaly, index) => ({
      id: `${anomaly.kind}-${anomaly.orderId}-${index}`,
      label: anomaly.orderId,
      reason: anomaly.details,
      recommendedAction: anomaly.kind === "paid_order_missing_grants" ? "نفّذ استعادة منح الوصول فوراً." : "افتح صفحة الطلبات ونفّذ تسوية النزاهة المناسبة.",
    })),
    risk: {
      severity: summarizeRiskSeverity(signals),
      signals,
    },
  };
}

export function getQueueAlertSummary(queues: ReviewQueuesSnapshot) {
  return {
    criticalPaymentsNeedingReview: queues.paymentRecoveryQueue.length,
    suspiciousAccountsOrDevices: queues.suspiciousUsersQueue.length + queues.suspiciousDeviceAttemptsQueue.length,
    integrityAnomalies: queues.ordersRequiringInterventionQueue.length,
    criticalRiskSignals: queues.risk.severity.critical,
  };
}
