import Link from "next/link";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
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

export default async function AdminPaymentsPage() {
  const attempts = await prisma.paymentAttempt.findMany({
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

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المدفوعات" description="مراجعة محاولات الدفع مع إجراءات إدارية آمنة وقابلة للتتبع." />
      <AdminTable
        caption="جدول المدفوعات"
        rows={attempts}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد محاولات دفع حالياً."
        columns={[
          { key: "id", title: "المحاولة", render: (row) => <Link className="font-mono text-xs text-indigo-700" href={`/admin/payments/${row.id}`}>{row.id}</Link> },
          { key: "tx", title: "tx", render: (row) => <span className="font-mono text-[11px]">{(row.requestPayload as { transactionReference?: string } | null)?.transactionReference ?? "—"}</span> },
          { key: "provider", title: "البوابة", render: (row) => <div><p>{providerLabel(row.provider)}</p><p className="font-mono text-[11px] text-slate-500">{row.providerReference ?? "—"}</p></div> },
          { key: "status", title: "الحالة", render: (row) => <div><p>المحاولة: {paymentAttemptStatusLabels[row.status]}</p><p className="text-xs">الدفع: {paymentStatusLabel(row.payment.status)}</p><p className="text-xs">الطلب: {row.order.status}</p></div> },
          { key: "amount", title: "المبلغ", render: (row) => formatArabicCurrency(row.amountCents / 100, { currency: row.currency }) },
          { key: "user", title: "المستخدم", render: (row) => row.user.email },
          { key: "failureReason", title: "سبب الفشل", render: (row) => <span className="text-xs">{row.failureReason ?? "—"}</span> },
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
