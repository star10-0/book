import { OrderStatus } from "@prisma/client";
import { recoverOrderAccessGrantAction, recheckPromoIntegrityAction, resolveStaleRentalGrantsAction } from "@/app/admin/orders/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { getOrderIntegritySnapshot } from "@/lib/admin/order-integrity";
import { prisma } from "@/lib/prisma";

function orderStatusLabel(status: OrderStatus) {
  if (status === "PAID") return "مدفوع";
  if (status === "CANCELLED") return "ملغى";
  if (status === "REFUNDED") return "مسترجع";
  return "بانتظار التأكيد";
}


function recommendedIntegrityAction(kind: string) {
  if (kind === "paid_order_missing_grants") return "استعادة منح الوصول للطلب المدفوع فوراً.";
  if (kind === "payment_order_grant_state_mismatch") return "تحقق من التسوية بين payment/order ثم أعد الفحص.";
  if (kind === "stale_rental_grant") return "شغّل تسوية الإيجارات المنتهية وإلغاء المنح المتأخرة.";
  if (kind === "promo_redemption_mismatch") return "أعد ربط redemption بالدفعة المناسبة أو صحح الحالة.";
  return "راجع السجل المرتبط ونفّذ إجراء التصحيح من أدوات الطلبات.";
}

export default async function AdminOrdersPage() {
  const [orders, integrity] = await Promise.all([
    prisma.order.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getOrderIntegritySnapshot(40),
  ]);

  const affectedOrderIds = new Set(
    integrity.anomalies
      .filter((entry) => entry.orderId && entry.orderId !== "—")
      .map((entry) => entry.orderId),
  );

  return (
    <div className="space-y-4" dir="rtl">
      <AdminPageCard>
        <AdminPageHeader title="نزاهة الطلبات والوصول" description="كشف حالات عدم الاتساق بين الطلبات/الدفع/المنح مع أدوات إصلاح آمنة." />
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <p className="rounded border border-amber-200 bg-amber-50 p-2">مدفوع بدون وصول: {integrity.totals.paid_order_missing_grants.toLocaleString("ar-SY")}</p>
          <p className="rounded border border-amber-200 bg-amber-50 p-2">وصول بدون تدفق مدفوع: {integrity.totals.grant_without_paid_flow.toLocaleString("ar-SY")}</p>
          <p className="rounded border border-amber-200 bg-amber-50 p-2">تضارب promo: {integrity.totals.promo_redemption_mismatch.toLocaleString("ar-SY")}</p>
          <p className="rounded border border-amber-200 bg-amber-50 p-2">إيجارات منتهية نشطة: {integrity.totals.stale_rental_grant.toLocaleString("ar-SY")}</p>
          <p className="rounded border border-amber-200 bg-amber-50 p-2">تضارب payment/order: {integrity.totals.payment_order_grant_state_mismatch.toLocaleString("ar-SY")}</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <form action={recheckPromoIntegrityAction} className="rounded border p-2">
            <input type="hidden" name="reason" value="bulk promo integrity recheck from orders" />
            <button className="rounded border px-2 py-1">إعادة فحص promo</button>
          </form>
          <form action={resolveStaleRentalGrantsAction} className="rounded border p-2">
            <input type="hidden" name="reason" value="bulk stale rental expiry reconcile from orders" />
            <button className="rounded border px-2 py-1">تسوية الإيجارات المنتهية</button>
          </form>
        </div>

        <div className="mt-3 space-y-2 text-xs">
          {integrity.anomalies.slice(0, 10).map((anomaly, idx) => (
            <article key={`${anomaly.kind}-${anomaly.orderId}-${idx}`} className="rounded border border-slate-200 p-2">
              <p className="font-semibold">{anomaly.kind}</p>
              <p>order: <span className="font-mono">{anomaly.orderId}</span> • user: <span className="font-mono">{anomaly.userId}</span></p>
              <p className="text-slate-600">{anomaly.details}</p>
              <p className="mt-1 text-slate-700">إجراء موصى: {recommendedIntegrityAction(anomaly.kind)}</p>
              {anomaly.kind === "paid_order_missing_grants" ? (
                <form action={recoverOrderAccessGrantAction} className="mt-2 space-y-2">
                  <input type="hidden" name="orderId" value={anomaly.orderId} />
                  <input name="incidentTicketId" required className="w-full rounded border px-2 py-1" placeholder="INC-1234" />
                  <input name="reason" required className="w-full rounded border px-2 py-1" defaultValue="recover missing access for paid order from anomaly list" />
                  <button className="rounded border px-2 py-1">استعادة منح الوصول</button>
                </form>
              ) : null}
            </article>
          ))}
          {integrity.anomalies.length === 0 ? <p className="text-slate-600">لا توجد مشاكل نزاهة مرصودة حالياً.</p> : null}
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="إدارة الطلبات" description="متابعة الطلبات وحالاتها المالية بشكل سريع." />
        <AdminTable
          caption="جدول الطلبات"
          rows={orders}
          getRowKey={(row) => row.id}
          emptyMessage="لا توجد طلبات حالياً. عند إنشاء طلبات من واجهة المتجر ستظهر هنا."
          columns={[
            { key: "id", title: "رقم الطلب", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
            {
              key: "user",
              title: "المستخدم",
              render: (row) => row.user.fullName?.trim() || row.user.email,
            },
            {
              key: "total",
              title: "الإجمالي",
              render: (row) => formatArabicCurrency(row.totalCents / 100, { currency: row.currency }),
            },
            {
              key: "status",
              title: "الحالة",
              render: (row) => (
                <div>
                  <p>{orderStatusLabel(row.status)}</p>
                  {affectedOrderIds.has(row.id) ? <p className="text-xs font-semibold text-amber-700">تحذير نزاهة</p> : null}
                </div>
              ),
            },
            {
              key: "actions",
              title: "أدوات",
              render: (row) => (
                <div className="flex flex-wrap gap-1 text-xs">
                  <form action={recoverOrderAccessGrantAction}>
                    <input type="hidden" name="orderId" value={row.id} />
                    <input name="incidentTicketId" required className="mb-1 rounded border px-2 py-1" placeholder="INC-1234" />
                    <input name="reason" required className="mb-1 rounded border px-2 py-1" defaultValue="manual order grant recovery from orders table" />
                    <button className="rounded border px-2 py-1">استعادة وصول</button>
                  </form>
                  <form action={recheckPromoIntegrityAction}>
                    <input type="hidden" name="orderId" value={row.id} />
                    <input type="hidden" name="reason" value="manual promo linkage recheck from orders table" />
                    <button className="rounded border px-2 py-1">فحص promo</button>
                  </form>
                </div>
              ),
            },
          ]}
        />
      </AdminPageCard>
    </div>
  );
}
