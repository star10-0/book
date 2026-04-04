import { PaymentAttemptStatus, Prisma } from "@prisma/client";
import { suspiciousSecurityEventTypes } from "@/lib/admin/security-signals";
import { prisma } from "@/lib/prisma";

export type ReportKind = "users" | "suspicious-activity" | "failed-payments" | "payment-incidents";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const normalized = String(value).replace(/\r?\n/g, " ");
  if (!/[",]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((key) => csvEscape(row[key])).join(","));
  }

  return lines.join("\n");
}

export async function buildReportCsv(kind: ReportKind) {
  if (kind === "users") {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        adminScopes: true,
        isActive: true,
        requirePasswordReset: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    return buildCsv(rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      admin_scopes: row.adminScopes.join("|"),
      is_active: row.isActive,
      require_password_reset: row.requirePasswordReset,
      created_at: row.createdAt.toISOString(),
      last_seen_at: row.lastSeenAt?.toISOString() ?? "",
    })));
  }

  if (kind === "suspicious-activity") {
    const rows = await prisma.userSecurityEvent.findMany({
      where: {
        type: { in: suspiciousSecurityEventTypes },
      },
      select: {
        id: true,
        type: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    return buildCsv(rows.map((row) => ({
      id: row.id,
      type: row.type,
      user_id: row.userId,
      ip_address: row.ipAddress ?? "",
      user_agent: row.userAgent ?? "",
      metadata: JSON.stringify(row.metadata as Prisma.JsonValue ?? {}),
      created_at: row.createdAt.toISOString(),
    })));
  }

  if (kind === "failed-payments") {
    const rows = await prisma.paymentAttempt.findMany({
      where: {
        OR: [
          { status: PaymentAttemptStatus.FAILED },
          { status: PaymentAttemptStatus.VERIFYING, updatedAt: { lt: new Date(Date.now() - 20 * 60 * 1000) } },
        ],
      },
      select: {
        id: true,
        userId: true,
        orderId: true,
        paymentId: true,
        provider: true,
        status: true,
        providerReference: true,
        failureReason: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });

    return buildCsv(rows.map((row) => ({
      id: row.id,
      user_id: row.userId,
      order_id: row.orderId,
      payment_id: row.paymentId,
      provider: row.provider,
      status: row.status,
      provider_reference: row.providerReference,
      transaction_reference: "",
      failure_reason: row.failureReason ?? "",
      updated_at: row.updatedAt.toISOString(),
    })));
  }

  const rows = await prisma.adminAuditLog.findMany({
    where: {
      action: {
        in: ["PAYMENT_RETRY_VERIFY", "PAYMENT_RECONCILE_BY_TX", "PAYMENT_FORCE_GRANT_ACCESS", "PAYMENT_TX_LOCK_RELEASED"],
      },
    },
    select: {
      id: true,
      action: true,
      actorAdminId: true,
      paymentAttemptId: true,
      orderId: true,
      reason: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return buildCsv(rows.map((row) => ({
    id: row.id,
    action: row.action,
    actor_admin_id: row.actorAdminId,
    payment_attempt_id: row.paymentAttemptId ?? "",
    order_id: row.orderId ?? "",
    reason: row.reason ?? "",
    metadata: JSON.stringify(row.metadata as Prisma.JsonValue ?? {}),
    created_at: row.createdAt.toISOString(),
  })));
}
