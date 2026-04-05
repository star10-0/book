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
import { getOrderIntegritySnapshot } from "@/lib/admin/order-integrity";
import { requireAdminScope } from "@/lib/auth-session";

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
  if (label === "verification_failed") return "فشل التحقق";
  if (label === "grant_missing") return "وصول مفقود بعد دفع ناجح";
  if (label === "provider_mismatch") return "عدم تطابق المزود";
  if (label === "tx_conflict") return "تعارض مرجع العملية";
  return "محاولة عالقة قابلة للاسترداد";
}

function recommendedPaymentAction(input: { incident: PaymentIncidentLabel | null; status: PaymentAttemptStatus }) {
  if (input.incident === "tx_conflict") return "طابق مرجع العملية يدويًا قبل أي منح وصول.";
  if (input.incident === "grant_missing") return "نفّذ منح وصول قسري بعد التحقق من حالة الدفع النهائية.";
  if (input.incident === "provider_mismatch") return "أوقف المعالجة وراجع تطابق مرجع المزود بين الدفع والمحاولة.";
  if (input.incident === "recoverable_stuck_attempt") return "نفّذ استرداد المحاولة العالقة ثم أعد التحقق.";
  if (input.status === "FAILED") return "راجع إثبات الدفع أو أعد إنشاء محاولة جديدة للمستخدم.";
  return "تابع المسار الحالي مع تسجيل سبب الإجراء في سجل التدقيق.";
}


function resolveAttemptIncident(input: {
  attemptStatus: PaymentAttemptStatus;
  paymentStatus: PaymentStatus;
  orderStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  failureReason: string | null;
  accessCount: number;
  transactionReference?: string;
  providerRef?: string | null;
  attemptProviderReference?: string | null;
}) {
  return classifyPaymentIncident({
    attemptStatus: input.attemptStatus,
    paymentStatus: input.paymentStatus,
    orderStatus: input.orderStatus,
    hasAccessGrant: input.accessCount > 0,
    failureReason: input.failureReason,
    hasTransactionReference: Boolean(input.transactionReference),
    providerReferenceMatchesPayment: !input.providerRef || input.providerRef === input.attemptProviderReference,
  });
}

function canReconcileByTx(transactionReference?: string) {
  return Boolean(transactionReference?.trim());
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });
  const params = searchParams ? await searchParams : {};
  const scope = parseScope(params.scope);

  const [attempts, integrity] = await Promise.all([
    prisma.paymentAttempt.findMany({
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
  }),
    getOrderIntegritySnapshot(1),
  ]);

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
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        تحذيرات نزاهة مرتبطة بالطلبات/الوصول: {Object.values(integrity.totals).reduce((sum, value) => sum + value, 0).toLocaleString("ar-SY")}
        {' '}— راجع صفحة الطلبات لمعالجة التفاصيل.
      </p>
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
          { key: "paymentId", title: "معرّف الدفع", render: (row) => <span className="font-mono text-[11px]">{row.paymentId}</span> },
          { key: "tx", title: "مرجع العملية", render: (row) => <span className="font-mono text-[11px]">{(row.requestPayload as { transactionReference?: string } | null)?.transactionReference ?? "—"}</span> },
          { key: "provider", title: "البوابة", render: (row) => <div><p>{providerLabel(row.provider)}</p><p className="font-mono text-[11px] text-slate-500">{row.providerReference ?? "—"}</p></div> },
          { key: "providerRefPayment", title: "providerRef (payment)", render: (row) => <span className="font-mono text-[11px]">{row.payment.providerRef ?? "—"}</span> },
          { key: "status", title: "الحالة", render: (row) => <div><p>المحاولة: {paymentAttemptStatusLabels[row.status]}</p><p className="text-xs">الدفع: {paymentStatusLabel(row.payment.status)}</p><p className="text-xs">الطلب: {row.order.status}</p></div> },
          { key: "amount", title: "المبلغ", render: (row) => formatArabicCurrency(row.amountCents / 100, { currency: row.currency }) },
          { key: "user", title: "المستخدم", render: (row) => row.user.email },
          { key: "failureReason", title: "سبب الفشل", render: (row) => <span className="text-xs">{row.failureReason ?? "—"}</span> },
          {
            key: "incident",
            title: "التشخيص",
            render: (row) => {
              const incident = resolveAttemptIncident({
                attemptStatus: row.status,
                paymentStatus: row.payment.status,
                orderStatus: row.order.status,
                failureReason: row.failureReason,
                accessCount: accessCountsByAttemptId.get(row.id) ?? 0,
                transactionReference: (row.requestPayload as { transactionReference?: string } | null)?.transactionReference,
                providerRef: row.payment.providerRef,
                attemptProviderReference: row.providerReference,
              });
              return <span className="text-xs font-medium">{incidentLabelText(incident)}</span>;
            },
          },
          {
            key: "recommended",
            title: "الإجراء الموصى",
            render: (row) => {
              const incident = resolveAttemptIncident({
                attemptStatus: row.status,
                paymentStatus: row.payment.status,
                orderStatus: row.order.status,
                failureReason: row.failureReason,
                accessCount: accessCountsByAttemptId.get(row.id) ?? 0,
                transactionReference: (row.requestPayload as { transactionReference?: string } | null)?.transactionReference,
                providerRef: row.payment.providerRef,
                attemptProviderReference: row.providerReference,
              });
              return <span className="text-xs">{recommendedPaymentAction({ incident, status: row.status })}</span>;
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
                <form action={reconcileByTxAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="userId" value={row.userId} /><input type="hidden" name="transactionReference" value={(row.requestPayload as { transactionReference?: string } | null)?.transactionReference || ""} /><input type="hidden" name="reason" value="reconcile by tx from list" /><button disabled={!canReconcileByTx((row.requestPayload as { transactionReference?: string } | null)?.transactionReference)} title={!canReconcileByTx((row.requestPayload as { transactionReference?: string } | null)?.transactionReference) ? "لا يمكن المطابقة لأن مرجع العملية غير متوفر." : undefined} className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50">مطابقة بالمرجع</button></form>
                <form action={recoverStuckAttemptAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="userId" value={row.userId} /><input type="hidden" name="transactionReference" value={(row.requestPayload as { transactionReference?: string } | null)?.transactionReference || ""} /><input type="hidden" name="reason" value="recover stuck attempt from list" /><button className="rounded border px-2 py-1">استرداد محاولة</button></form>
                <form action={releasePaymentTxLockAction}><input type="hidden" name="attemptId" value={row.id} /><input type="hidden" name="reason" value="release tx lock from list" /><button disabled={row.status !== "VERIFYING"} title={row.status !== "VERIFYING" ? "تحرير القفل متاح فقط عند حالة VERIFYING." : undefined} className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50">تحرير قفل</button></form>
              </div>
            ),
          },
          { key: "times", title: "التواريخ", render: (row) => <div className="text-xs"><p>{formatArabicDate(row.createdAt, { dateStyle: "short", timeStyle: "short" })}</p><p>{row.verifiedAt ? formatArabicDate(row.verifiedAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p></div> },
        ]}
      />
    </AdminPageCard>
  );
}
