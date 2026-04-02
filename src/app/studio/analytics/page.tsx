import { OfferType, OrderStatus } from "@prisma/client";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function StudioAnalyticsPage() {
  const user = await requireCreator({ callbackUrl: "/studio/analytics" });

  const paidItems = await prisma.orderItem.findMany({
    where: {
      book: { creatorId: user.id },
      order: { status: OrderStatus.PAID },
    },
    select: {
      offerType: true,
      unitPriceCents: true,
      quantity: true,
      createdAt: true,
      book: { select: { titleAr: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const summary = paidItems.reduce(
    (acc, item) => {
      const amount = item.unitPriceCents * item.quantity;
      if (item.offerType === OfferType.PURCHASE) acc.purchase += amount;
      else acc.rental += amount;
      acc.total += amount;
      return acc;
    },
    { purchase: 0, rental: 0, total: 0 },
  );

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir="rtl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">تحليلات الكاتب</h2>
              </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-slate-500">إيراد الشراء</p>
          <p className="text-xl font-bold text-slate-900">{formatArabicCurrency(summary.purchase / 100)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-slate-500">إيراد الإيجار</p>
          <p className="text-xl font-bold text-slate-900">{formatArabicCurrency(summary.rental / 100)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-slate-500">الإيراد الكلي</p>
          <p className="text-xl font-bold text-slate-900">{formatArabicCurrency(summary.total / 100)}</p>
        </article>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900">آخر العمليات المدفوعة</h3>
        {paidItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">لا توجد طلبات مدفوعة بعد.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {paidItems.map((item) => (
              <li key={`${item.book.titleAr}-${item.createdAt.toISOString()}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">{item.book.titleAr}</p>
                <p className="text-slate-600">النوع: {item.offerType === OfferType.PURCHASE ? "شراء" : "إيجار"}</p>
                <p className="text-slate-600">المبلغ: {formatArabicCurrency((item.unitPriceCents * item.quantity) / 100)}</p>
                <p className="text-xs text-slate-500">{formatArabicDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
