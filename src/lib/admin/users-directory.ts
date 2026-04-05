import { PaymentAttemptStatus, Prisma, UserRole } from "@prisma/client";
import { suspiciousSecurityEventTypes } from "@/lib/admin/security-signals";
import { prisma } from "@/lib/prisma";

export type AdminUsersScope = "all" | "banned" | "suspicious";

export type AdminUsersListRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  lastSeenAt: Date | null;
  ordersCount: number;
  accessGrantsCount: number;
  trustedDevicesCount: number;
  activeDevicesCount: number | null;
};

export type AdminUserDetailsData = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  lastSeenAt: Date | null;
  requirePasswordReset: boolean;
  sessionVersion: number;
  bannedReason: string | null;
  ordersCount: number;
  accessGrantsCount: number;
  trustedDevicesCount: number;
  suspiciousEventsCount: number;
  paymentSummary: {
    pending: number;
    succeeded: number;
    failed: number;
    total: number;
  };
  trustedDevices: Array<{
    id: string;
    label: string | null;
    userAgent: string | null;
    ipAddress: string | null;
    lastSeenAt: Date;
    revokedAt: Date | null;
    isPrimary: boolean;
    isTrusted: boolean;
  }>;
  securityEvents: Array<{
    id: string;
    type: string;
    ipAddress: string | null;
    createdAt: Date;
  }>;
  adminAuditLogs: Array<{
    id: string;
    action: string;
    createdAt: Date;
    actorAdminEmail: string;
  }>;
};

type UsersDirectoryDeps = {
  findSuspiciousUserIds: () => Promise<string[]>;
  findUsers: (args: { where: Prisma.UserWhereInput }) => Promise<AdminUsersListRow[]>;
  findUserDetails: (userId: string) => Promise<AdminUserDetailsData | null>;
};

const defaultDeps: UsersDirectoryDeps = {
  findSuspiciousUserIds: async () => {
    const suspiciousEvents = await prisma.userSecurityEvent.findMany({
      where: {
        type: { in: suspiciousSecurityEventTypes },
      },
      select: { userId: true },
      orderBy: { createdAt: "desc" },
      take: 300,
      distinct: ["userId"],
    });

    return suspiciousEvents.map((event) => event.userId);
  },
  findUsers: async ({ where }) => {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        _count: {
          select: {
            orders: true,
            accessGrants: true,
            trustedDevices: { where: { revokedAt: null, isTrusted: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastSeenAt: user.lastSeenAt,
      ordersCount: user._count.orders,
      accessGrantsCount: user._count.accessGrants,
      trustedDevicesCount: user._count.trustedDevices,
      // This metric is intentionally unavailable until live device-session telemetry is implemented.
      activeDevicesCount: null,
    }));
  },
  findUserDetails: async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trustedDevices: { orderBy: { lastSeenAt: "desc" }, take: 20 },
        securityEvents: { orderBy: { createdAt: "desc" }, take: 20 },
        paymentAttempts: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, status: true, createdAt: true } },
        adminAuditLogs: { orderBy: { createdAt: "desc" }, take: 20, include: { actorAdmin: { select: { email: true } } } },
        _count: { select: { orders: true, accessGrants: true } },
      },
    });

    if (!user) {
      return null;
    }

    const pendingStatuses: PaymentAttemptStatus[] = ["PENDING", "VERIFYING", "SUBMITTED"];

    const suspiciousEventsCount = user.securityEvents.filter((event) => suspiciousSecurityEventTypes.includes(event.type)).length;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastSeenAt: user.lastSeenAt,
      requirePasswordReset: user.requirePasswordReset,
      sessionVersion: user.sessionVersion,
      bannedReason: user.bannedReason,
      ordersCount: user._count.orders,
      accessGrantsCount: user._count.accessGrants,
      trustedDevicesCount: user.trustedDevices.filter((device) => device.revokedAt === null && device.isTrusted).length,
      suspiciousEventsCount,
      paymentSummary: {
        pending: user.paymentAttempts.filter((item) => pendingStatuses.includes(item.status)).length,
        succeeded: user.paymentAttempts.filter((item) => item.status === "PAID").length,
        failed: user.paymentAttempts.filter((item) => item.status === "FAILED").length,
        total: user.paymentAttempts.length,
      },
      trustedDevices: user.trustedDevices,
      securityEvents: user.securityEvents,
      adminAuditLogs: user.adminAuditLogs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        actorAdminEmail: entry.actorAdmin.email,
      })),
    };
  },
};

export function parseUsersScope(scopeValue?: string | string[]): AdminUsersScope {
  const value = Array.isArray(scopeValue) ? scopeValue[0] : scopeValue;
  if (value === "banned" || value === "suspicious") return value;
  return "all";
}

export async function resolveUsersWhere(scope: AdminUsersScope, deps: Pick<UsersDirectoryDeps, "findSuspiciousUserIds"> = defaultDeps): Promise<Prisma.UserWhereInput> {
  if (scope === "banned") {
    return { isActive: false };
  }

  if (scope === "suspicious") {
    const userIds = await deps.findSuspiciousUserIds();
    if (userIds.length === 0) {
      return { id: "__none__" };
    }

    return { id: { in: userIds } };
  }

  return {};
}

export async function getAdminUsersList(scope: AdminUsersScope, deps: UsersDirectoryDeps = defaultDeps) {
  const where = await resolveUsersWhere(scope, deps);
  return deps.findUsers({ where });
}

export async function getAdminUserDetails(userId: string, deps: Pick<UsersDirectoryDeps, "findUserDetails"> = defaultDeps) {
  return deps.findUserDetails(userId);
}
