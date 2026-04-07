import Link from "next/link";
import { requireUser } from "@/lib/auth-session";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { orderStatusMeta } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function AccountOrdersPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: {
          id: true,
          titleSnapshot: true,
        },
        take: 3,
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return (
    <main>
      <section className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">طلباتي</h1>
          <p className="text-sm text-slate-600">عرض كل الطلبات الخاصة بحسابك.</p>
        </header>

        {orders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
            لا توجد طلبات بعد. يمكنك البدء من صفحة الكتب.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {orders.map((order) => {
              const status = orderStatusMeta[order.status];

              return (
                <li key={order.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{order.publicOrderNumber}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">{formatArabicDate(order.createdAt)}</p>

                  <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
                    {order.items.map((item) => (
                      <li key={item.id}>{item.titleSnapshot}</li>
                    ))}
                    {order._count.items > order.items.length ? <li>وغيرها من العناصر...</li> : null}
                  </ul>

                  <p className="mt-3 font-bold text-indigo-700">{formatArabicCurrency(order.totalCents / 100, { currency: order.currency })}</p>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/orders/${order.id}/summary`}
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      ملخص الطلب
                    </Link>
                    <Link
                      href={`/checkout/${order.id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      متابعة الدفع
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
