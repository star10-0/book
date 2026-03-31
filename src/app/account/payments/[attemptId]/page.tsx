import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-session";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { paymentAttemptStatusLabels } from "@/lib/payments/status-flow";
import { prisma } from "@/lib/prisma";

type AccountPaymentAttemptDetailsPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function AccountPaymentAttemptDetailsPage({ params }: AccountPaymentAttemptDetailsPageProps) {
  const { attemptId } = await params;
  const user = await requireUser();

  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      id: attemptId,
      userId: user.id,
    },
    include: {
      payment: true,
      order: true,
    },
  });

  if (!attempt) {
    notFound();
  }

  return (
    <main>
      <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">تفاصيل محاولة الدفع</h1>
          <p className="text-sm text-slate-600">يمكنك متابعة حالة المعاملة والعودة لمسار الدفع عند الحاجة.</p>
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">معرف المحاولة</dt>
            <dd className="mt-1 font-mono text-xs text-slate-900">{attempt.id}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">الحالة</dt>
            <dd className="mt-1 font-semibold text-slate-900">{paymentAttemptStatusLabels[attempt.status]}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">المزود</dt>
            <dd className="mt-1 font-semibold text-slate-900">{attempt.provider}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">المبلغ</dt>
            <dd className="mt-1 font-semibold text-indigo-700">{formatArabicCurrency(attempt.amountCents / 100, { currency: attempt.currency })}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">تاريخ الإنشاء</dt>
            <dd className="mt-1 text-slate-900">{formatArabicDate(attempt.createdAt)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">آخر تحقق</dt>
            <dd className="mt-1 text-slate-900">{attempt.verifiedAt ? formatArabicDate(attempt.verifiedAt) : "لم يتم بعد"}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
            <dt className="text-slate-500">مرجع مزود الدفع</dt>
            <dd className="mt-1 font-mono text-xs text-slate-900">{attempt.providerReference ?? "غير متوفر بعد"}</dd>
          </div>

        </dl>

        {attempt.failureReason ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">سبب الفشل: {attempt.failureReason}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/checkout/${attempt.orderId}`}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            متابعة الدفع
          </Link>
          <Link
            href={`/orders/${attempt.orderId}/summary`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            ملخص الطلب
          </Link>
          <Link
            href="/account/payments"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            كل المدفوعات
          </Link>
        </div>
      </section>
    </main>
  );
}
