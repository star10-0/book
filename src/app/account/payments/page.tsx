import Link from "next/link";
import { requireUser } from "@/lib/auth-session";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { paymentAttemptStatusLabels } from "@/lib/payments/status-flow";
import { prisma } from "@/lib/prisma";

export default async function AccountPaymentsPage() {
  const user = await requireUser();

  const attempts = await prisma.paymentAttempt.findMany({
    where: { userId: user.id },
    include: {
      order: {
        select: {
          id: true,
          publicOrderNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <section className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">عمليات الدفع</h1>
          <p className="text-sm text-slate-600">تتبع حالة جميع محاولات الدفع من حسابك.</p>
        </header>

        {attempts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">لا توجد محاولات دفع حتى الآن.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{attempt.publicPaymentReference}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {paymentAttemptStatusLabels[attempt.status]}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">{formatArabicDate(attempt.createdAt)}</p>
                <p className="mt-2 text-sm text-slate-600">الطلب المرتبط: {attempt.order.publicOrderNumber}</p>
                                <p className="mt-2 font-semibold text-indigo-700">{formatArabicCurrency(attempt.amountCents / 100, { currency: attempt.currency })}</p>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/account/payments/${attempt.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    تفاصيل الدفع
                  </Link>
                  <Link
                    href={`/checkout/${attempt.orderId}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    متابعة الدفع
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
