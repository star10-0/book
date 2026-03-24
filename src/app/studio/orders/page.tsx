import { UserRole } from "@prisma/client";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function StudioOrdersPage() {
  const user = await requireCreator({ callbackUrl: "/studio/orders" });

  const orderItems = await prisma.orderItem.findMany({
    where: user.role === UserRole.ADMIN ? {} : { book: { creatorId: user.id } },
    include: {
      book: { select: { titleAr: true } },
      order: { select: { id: true, status: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">الطلبات على كتبك</h2>
      <div className="mt-4 space-y-2">
        {orderItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-900">{item.book.titleAr}</p>
            <p className="text-slate-600">طلب: {item.order.id}</p>
            <p className="text-slate-600">الحالة: {item.order.status}</p>
          </div>
        ))}
        {orderItems.length === 0 ? <p className="text-sm text-slate-500">لا توجد طلبات بعد.</p> : null}
      </div>
    </section>
  );
}
