import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { paymentAttemptStatusLabels } from "@/lib/payments/status-flow";
import { prisma } from "@/lib/prisma";

function providerLabel(provider: PaymentProvider) {
  if (provider === "SHAM_CASH") return "Sham Cash";
  if (provider === "SYRIATEL_CASH") return "Syriatel Cash";
  if (provider === "MANUAL") return "Manual";
  return "Stripe";
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
      payment: {
        select: {
          id: true,
          status: true,
          providerRef: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
      order: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المدفوعات" description="مراجعة محاولات الدفع والتأكد من سلامة المراجع والحالات قبل المطابقة المالية." />
      <AdminTable
        caption="جدول المدفوعات"
        rows={attempts}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد محاولات دفع حالياً. ستظهر هنا تلقائياً بعد بدء عمليات الدفع."
        columns={[
          { key: "id", title: "المحاولة", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
          {
            key: "provider",
            title: "بوابة الدفع",
            render: (row) => (
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{providerLabel(row.provider)}</p>
                <p className="font-mono text-[11px] text-slate-500">{row.providerReference ?? "بدون مرجع مزود"}</p>
              </div>
            ),
          },
          {
            key: "status",
            title: "الحالة",
            render: (row) => (
              <div className="space-y-1">
                <p className="text-slate-900">{paymentAttemptStatusLabels[row.status]}</p>
                <p className="text-xs text-slate-500">الدفع: {paymentStatusLabel(row.payment.status)}</p>
                <p className="text-xs text-slate-500">الطلب: {row.order.status}</p>
              </div>
            ),
          },
          {
            key: "amount",
            title: "المبلغ",
            render: (row) => formatArabicCurrency(row.amountCents / 100, { currency: row.currency }),
          },
          {
            key: "review",
            title: "مراجعة",
            render: (row) => (
              <div className="space-y-1 text-xs">
                <p className="text-slate-600">المستخدم: {row.user.email}</p>
                <p className="text-slate-600">الإنشاء: {formatArabicDate(row.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
                <p className="text-slate-600">التحقق: {row.verifiedAt ? formatArabicDate(row.verifiedAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
                <p className={row.payment.providerRef && row.providerReference && row.payment.providerRef === row.providerReference ? "text-emerald-700" : "text-amber-700"}>
                  تطابق مرجع المزود: {row.payment.providerRef && row.providerReference && row.payment.providerRef === row.providerReference ? "نعم" : "تحقق يدوياً"}
                </p>
              </div>
            ),
          },
        ]}
      />
    </AdminPageCard>
  );
}
