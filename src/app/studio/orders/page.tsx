import { OfferType, OrderStatus } from "@prisma/client";
import { formatArabicDate } from "@/lib/formatters/intl";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function mapOrderStatus(status: OrderStatus) {
  if (status === OrderStatus.PAID) return "مدفوع";
  if (status === OrderStatus.PENDING) return "قيد الانتظار";
  if (status === OrderStatus.CANCELLED) return "ملغي";
  return "مسترد";
}

function mapOfferType(type: OfferType) {
  return type === OfferType.PURCHASE ? "شراء" : "إيجار";
}

export default async function StudioOrdersPage() {
  const user = await requireCreator({ callbackUrl: "/studio/orders" });

  const [orderItems, counts] = await Promise.all([
    prisma.orderItem.findMany({
      where: { book: { creatorId: user.id } },
      include: {
        book: { select: { titleAr: true } },
        order: { select: { id: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.orderItem.groupBy({
      by: ["offerType"],
      where: { book: { creatorId: user.id } },
      _count: { _all: true },
    }),
  ]);

  const purchaseOrders = counts.find((item) => item.offerType === OfferType.PURCHASE)?._count._all ?? 0;
  const rentalOrders = counts.find((item) => item.offerType === OfferType.RENTAL)?._count._all ?? 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir="rtl">
      <h2 className="text-lg font-bold text-slate-900">الطلبات على كتبك</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-slate-500">طلبات الشراء</p>
          <p className="text-xl font-bold text-slate-900">{purchaseOrders}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-slate-500">طلبات الإيجار</p>
          <p className="text-xl font-bold text-slate-900">{rentalOrders}</p>
        </article>
      </div>

      <div className="mt-4 space-y-2">
        {orderItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-900">{item.book.titleAr}</p>
            <p className="text-slate-600">النوع: {mapOfferType(item.offerType)}</p>
            <p className="text-slate-600">طلب: {item.order.id}</p>
            <p className="text-slate-600">الحالة: {mapOrderStatus(item.order.status)}</p>
            <p className="text-xs text-slate-500">{formatArabicDate(item.order.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        ))}
        {orderItems.length === 0 ? <p className="text-sm text-slate-500">لا توجد طلبات بعد.</p> : null}
      </div>
    </section>
  );
}
