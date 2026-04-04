import { NextResponse } from "next/server";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import { buildReportCsv, type ReportKind } from "@/lib/admin/reports";
import { requireAdminScope } from "@/lib/auth-session";

const ALLOWED_KINDS: ReportKind[] = ["users", "suspicious-activity", "failed-payments", "payment-incidents"];

function isReportKind(value: string): value is ReportKind {
  return ALLOWED_KINDS.includes(value as ReportKind);
}

function scopeFor(kind: ReportKind) {
  if (kind === "users" || kind === "suspicious-activity") return "SUPPORT_ADMIN" as const;
  return "PAYMENT_ADMIN" as const;
}

export async function GET(_: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;

  if (!isReportKind(kind)) {
    return NextResponse.json({ ok: false, error: "unsupported_report_kind" }, { status: 404 });
  }

  const admin = await requireAdminScope(scopeFor(kind), { callbackUrl: "/admin/reports" });
  const csv = await buildReportCsv(kind);

  await createAdminAuditLog({
    actorAdminId: admin.id,
    action: "REPORT_EXPORTED",
    reason: `report export: ${kind}`,
    metadata: { reportKind: kind, source: "api/admin/reports" },
  });

  const fileName = `book-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"${fileName}\"`,
      "cache-control": "no-store",
    },
  });
}
