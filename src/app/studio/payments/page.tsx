import { UserRole } from "@prisma/client";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export default async function StudioPaymentsPage() {
  const user = await requireCreator({ callbackUrl: "/studio/payments" });

  const attempts = await prisma.paymentAttempt.findMany({
    where: user.role === UserRole.ADMIN ? {} : { order: { items: { some: { book: { creatorId: user.id } } } } },
    include: {
      order: {
        select: {
          id: true,
          totalCents: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">مدفوعات كتبك</h2>
      <div className="mt-4 space-y-2">
        {attempts.map((attempt) => (
          <div key={attempt.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-900">طلب #{attempt.order.id}</p>
            <p className="text-slate-600">الحالة: {attempt.status}</p>
            <p className="text-slate-600">الإجمالي: {(attempt.order.totalCents / 100).toLocaleString("ar-SY")} ل.س</p>
          </div>
        ))}
        {attempts.length === 0 ? <p className="text-sm text-slate-500">لا توجد مدفوعات بعد.</p> : null}
      </div>
    </section>
  );
}
