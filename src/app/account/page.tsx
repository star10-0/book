import Link from "next/link";
import { AccessGrantType } from "@prisma/client";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth-session";
import { formatArabicCurrency, formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

export default async function AccountPage() {
  const user = await requireUser({ callbackUrl: "/account" });
  const now = new Date();

  const [ordersCount, paidOrdersCount, latestOrder, ownedBooksCount, activeRentalsCount] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.count({ where: { userId: user.id, status: "PAID" } }),
    prisma.order.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalCents: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.accessGrant.count({
      where: {
        userId: user.id,
        type: AccessGrantType.PURCHASE,
        status: "ACTIVE",
      },
    }),
    prisma.accessGrant.count({
      where: {
        userId: user.id,
        type: AccessGrantType.RENTAL,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
  ]);

  return (
    <main>
      <SiteHeader />
      <section className="space-y-6">
        <header className="space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">مرحبًا {user.name ?? "بك"}</h1>
          <p className="text-sm text-slate-600">هذه نظرة سريعة على حسابك ومحتواك في المكتبة الرقمية.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ملخص الحساب">
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">إجمالي الطلبات</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{ordersCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">الطلبات المدفوعة</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{paidOrdersCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">الكتب المملوكة</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{ownedBooksCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">الإعارات النشطة</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{activeRentalsCount}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">آخر طلب</h2>
            {latestOrder ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>رقم الطلب: #{latestOrder.id.slice(-6)}</p>
                <p>التاريخ: {formatArabicDate(latestOrder.createdAt)}</p>
                <p className="font-semibold text-indigo-700">
                  المبلغ: {formatArabicCurrency(latestOrder.totalCents / 100, { currency: latestOrder.currency })}
                </p>
                <Link
                  href={`/account/orders/${latestOrder.id}`}
                  className="mt-2 inline-flex rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-100"
                >
                  عرض تفاصيل الطلب
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">لا توجد طلبات بعد.</p>
            )}
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">روابط سريعة</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              <li>
                <Link href="/account/profile" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  إدارة الملف الشخصي
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  متابعة الطلبات
                </Link>
              </li>
              <li>
                <Link href="/account/library" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  فتح مكتبتي
                </Link>
              </li>
              <li>
                <Link href="/account/rentals" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  مراجعة الإعارات
                </Link>
              </li>
              <li>
                <Link href="/account/payments" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  تتبع المدفوعات
                </Link>
              </li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}
