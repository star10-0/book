import Link from "next/link";
import { PaymentAttemptStatus, PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import {
  reconcileByTxAction,
  recoverStuckAttemptAction,
  releasePaymentTxLockAction,
  retryVerifyPaymentAction,
} from "@/app/admin/payments/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { paymentAttemptStatusLabels } from "@/lib/payments/status-flow";
import { classifyPaymentIncident, type PaymentIncidentLabel } from "@/lib/admin/payment-admin";
import { prisma } from "@/lib/prisma";

function providerLabel(provider: PaymentProvider) {
  if (provider === "SHAM_CASH") return "Sham Cash";
  if (provider === "SYRIATEL_CASH") return "Syriatel Cash";
  if (provider === "MANUAL") return "Manual";
  return "غير معروف";
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "SUCCEEDED") return "ناجحة";
  if (status === "FAILED") return "فاشلة";
  if (status === "REFUNDED") return "مسترجعة";
  return "قيد الانتظار";
}

type PaymentsScope = "all" | "needs-review" | "issues";

type AdminPaymentsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseScope(scopeValue?: string | string[]): PaymentsScope {
  const value = Array.isArray(scopeValue) ? scopeValue[0] : scopeValue;
  if (value === "needs-review" || value === "issues") return value;
  return "all";
}

function resolveScopeWhere(scope: PaymentsScope): Prisma.PaymentAttemptWhereInput {
  if (scope === "needs-review") {
    return {
      status: {
        in: [PaymentAttemptStatus.PENDING, PaymentAttemptStatus.SUBMITTED, PaymentAttemptStatus.VERIFYING],
      },
    };
  }

  if (scope === "issues") {
    return {
      OR: [
        { status: PaymentAttemptStatus.FAILED },
        {
          status: PaymentAttemptStatus.VERIFYING,
          updatedAt: { lt: new Date(Date.now() - 1000 * 60 * 20) },
        },
      ],
    };
  }

  return {};
}

function scopeDescription(scope: PaymentsScope) {
  if (scope === "needs-review") {
    return "عرض محاولات الدفع التي ما زالت تحتاج مراجعة إدارية (PENDING/SUBMITTED/VERIFYING).";
  }

  if (scope === "issues") {
    return "عرض محاولات الدفع الفاشلة أو العالقة في التحقق لتسريع الاستجابة التشغيلية.";
  }

  return "مراجعة محاولات الدفع مع إجراءات إدارية آمنة وقابلة للتتبع.";
}

function incidentLabelText(label: PaymentIncidentLabel | null) {
  if (!label) return "—";
  if (label === "verification_failed") return "verification_failed";
  if (label === "grant_missing") return "grant_missing";
  if (label === "provider_mismatch") return "provider_mismatch";
  if (label === "tx_conflict") return "tx_conflict";
  return "recoverable_stuck_attempt";
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const params = searchParams ? await searchParams : {};
  const scope = parseScope(params.scope);

  const attempts = await prisma.paymentAttempt.findMany({
    where: resolveScopeWhere(scope),
    include: {
      payment: { select: { id: true, status: true, providerRef: true } },
      user: { select: { email: true } },
      order: { select: { status: true } },
      adminAuditLogs: {
        select: { id: true, action: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { adminAuditLogs: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const accessCountsByAttemptId = new Map(
    await Promise.all(
      attempts.map(async (attempt) => {
        const count = await prisma.accessGrant.count({
          where: {
            userId: attempt.userId,
            status: "ACTIVE",
            orderItem: { orderId: attempt.orderId },
          },
        });
        return [attempt.id, count] as const;
      }),
    ),
  );

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المدفوعات" description={scopeDescription(scope)} />
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/admin/payments" className={`rounded border px-3 py-1.5 ${scope === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
          الكل
        </Link>
        <Link href="/admin/payments?scope=needs-review" className={`rounded border px-3 py-1.5 ${scope === "needs-review" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
          تحتاج مراجعة
        </Link>
        <Link href="/admin/payments?scope=issues" className={`rounded border px-3 py-1.5 ${scope === "issues" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
          مشكلات
        </Link>
      </div>
      <AdminTable
        caption="جدول المدفوعات"
        rows={attempts}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد محاولات دفع ضمن هذا النطاق حالياً."
        columns={[
          { key: "id", title: "المحاولة", render: (row) => <Link className="font-mono text-xs text-indigo-700" href={`/admin/payments/${row.id}`}>{row.id}</Link> },
          { key: "paymentId", title: "payment", render: (row) => <span className="font-mono text-[11px]">{row.paymentId}</span> },
          { key: "tx", title: "tx", render: (row) => <span className="font-mono text-[11px]">{(row.requestPayload as { transactionReference?: string } | null)?.transactionReference ?? "—"}</span> },
          { key: "provider", title: "البوابة", render: (row) => <div><p>{providerLabel(row.provider)}</p><p className="font-mono text-[11px] text-slate-500">{row.providerReference ?? "—"}</p></div> },
          { key: "providerRefPayment", title: "providerRef (payment)", render: (row) => <span className="font-mono text-[11px]">{row.payment.providerRef ?? "—"}</span> },
          { key: "status", title: "الحالة", render: (row) => <div><p>المحاولة: {paymentAttemptStatusLabels[row.status]}</p><p className="text-xs">الدفع: {paymentStatusLabel(row.payment.status)}</p><p className="text-xs">الطلب: {row.order.status}</p></div> },
          { key: "amount", title: "المبلغ", render: (row) => formatArabicCurrency(row.amountCents / 100, { currency: row.currency }) },
          { key: "user", title: "المستخدم", render: (row) => row.user.email },
          { key: "failureReason", title: "سبب الفشل", render: (row) => <span className="text-xs">{row.failureReason ?? "—"}</span> },
          {
            key: "incident",
            title: "incident",
            render: (row) => {
              const hasAccessGrant = (accessCountsByAttemptId.get(row.id) ?? 0) > 0;
              const incident = classifyPaymentIncident({
                attemptStatus: row.status,
                paymentStatus: row.payment.status,
                orderStatus: row.order.status,
                hasAccessGrant,
                failureReason: row.failureReason,
                hasTransactionReference: Boolean((row.requestPayload as { transactionReference?: string } | null)?.transactionReference),
                providerReferenceMatchesPayment: !row.payment.providerRef || row.payment.providerRef === row.providerReference,
              });
              return <span className="text-xs font-medium">{incidentLabelText(incident)}</span>;
            },
          },
          {
            key: "audit",
            title: "سجل إداري",
            render: (row) => (
              <div className="text-xs">
                <p>{row._count.adminAuditLogs.toLocaleString("ar-SY")}</p>
                <p className="text-slate-500">{row.adminAuditLogs[0] ? `${row.adminAuditLogs[0].action}` : "—"}</p>
              </div>
            ),
          },
          {
            key: "actions",
            title: "إجراءات",
            render: (row) => (
              <div className="flex flex-wrap gap-1 text-xs">
                <form action={retryVerifyPaymentAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="userId" value={row.userId} /><input type="hidden" name="reason" value="retry verify from payments list" /><button className="rounded border px-2 py-1">إعادة تحقق</button></form>
                <form action={reconcileByTxAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="userId" value={row.userId} /><input type="hidden" name="transactionReference" value={(row.requestPayload as { transactionReference?: string } | null)?.transactionReference || ""} /><input type="hidden" name="reason" value="reconcile by tx from list" /><button className="rounded border px-2 py-1">مطابقة بالمرجع</button></form>
                <form action={recoverStuckAttemptAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="userId" value={row.userId} /><input type="hidden" name="transactionReference" value={(row.requestPayload as { transactionReference?: string } | null)?.transactionReference || ""} /><input type="hidden" name="reason" value="recover stuck attempt from list" /><button className="rounded border px-2 py-1">استرداد محاولة</button></form>
                <form action={releasePaymentTxLockAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="reason" value="release tx lock from list" /><button className="rounded border px-2 py-1">تحرير قفل</button></form>
              </div>
            ),
          },
          { key: "times", title: "التواريخ", render: (row) => <div className="text-xs"><p>{formatArabicDate(row.createdAt, { dateStyle: "short", timeStyle: "short" })}</p><p>{row.verifiedAt ? formatArabicDate(row.verifiedAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p></div> },
        ]}
      />
    </AdminPageCard>
  );
}
