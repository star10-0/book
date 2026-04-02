import Link from "next/link";
import { AccessGrantType } from "@prisma/client";
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
      <section className="space-y-6">
        <header className="space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">ط¸â€¦ط·آ±ط·آ­ط·آ¨ط¸â€¹ط·آ§ {user.name ?? "ط·آ¨ط¸ئ’"}</h1>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ط¸â€¦ط¸â€‍ط·آ®ط·آµ ط·آ§ط¸â€‍ط·آ­ط·آ³ط·آ§ط·آ¨">
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{ordersCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸ظ¾ط¸ث†ط·آ¹ط·آ©</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{paidOrdersCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">ط·آ§ط¸â€‍ط¸ئ’ط·ع¾ط·آ¨ ط·آ§ط¸â€‍ط¸â€¦ط¸â€¦ط¸â€‍ط¸ث†ط¸ئ’ط·آ©</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{ownedBooksCount}</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ§ط·آ±ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€ ط·آ´ط·آ·ط·آ©</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{activeRentalsCount}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">ط·آ¢ط·آ®ط·آ± ط·آ·ط¸â€‍ط·آ¨</h2>
            {latestOrder ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>ط·آ±ط¸â€ڑط¸â€¦ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨: #{latestOrder.id.slice(-6)}</p>
                <p>ط·آ§ط¸â€‍ط·ع¾ط·آ§ط·آ±ط¸ظ¹ط·آ®: {formatArabicDate(latestOrder.createdAt)}</p>
                <p className="font-semibold text-indigo-700">
                  ط·آ§ط¸â€‍ط¸â€¦ط·آ¨ط¸â€‍ط·ط›: {formatArabicCurrency(latestOrder.totalCents / 100, { currency: latestOrder.currency })}
                </p>
                <Link
                  href={`/account/orders/${latestOrder.id}`}
                  className="mt-2 inline-flex rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-100"
                >
                  ط·آ¹ط·آ±ط·آ¶ ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">ط¸â€‍ط·آ§ ط·ع¾ط¸ث†ط·آ¬ط·آ¯ ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾ ط·آ¨ط·آ¹ط·آ¯.</p>
            )}
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">ط·آ±ط¸ث†ط·آ§ط·آ¨ط·آ· ط·آ³ط·آ±ط¸ظ¹ط·آ¹ط·آ©</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              <li>
                <Link href="/account/profile" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  ط·آ¥ط·آ¯ط·آ§ط·آ±ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط·آ§ط¸â€‍ط·آ´ط·آ®ط·آµط¸ظ¹
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  ط¸â€¦ط·ع¾ط·آ§ط·آ¨ط·آ¹ط·آ© ط·آ§ط¸â€‍ط·آ·ط¸â€‍ط·آ¨ط·آ§ط·ع¾
                </Link>
              </li>
              <li>
                <Link href="/account/library" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  ط¸ظ¾ط·ع¾ط·آ­ ط¸â€¦ط¸ئ’ط·ع¾ط·آ¨ط·ع¾ط¸ظ¹
                </Link>
              </li>
              <li>
                <Link href="/account/rentals" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  ط¸â€¦ط·آ±ط·آ§ط·آ¬ط·آ¹ط·آ© ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ§ط·آ±ط·آ§ط·ع¾
                </Link>
              </li>
              <li>
                <Link href="/account/payments" className="inline-flex font-semibold text-indigo-700 hover:text-indigo-600">
                  ط·ع¾ط·ع¾ط·آ¨ط·آ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ¯ط¸ظ¾ط¸ث†ط·آ¹ط·آ§ط·ع¾
                </Link>
              </li>
            </ul>
          </article>
        </section>
      </section>
    </main>
  );
}
