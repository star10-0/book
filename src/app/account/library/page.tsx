import Link from "next/link";
import { AccessGrantType } from "@prisma/client";
import { requireUser } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

function getRemainingDays(expiresAt: Date) {
  const diffMs = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export default async function AccountLibraryPage() {
  const user = await requireUser();
  const now = new Date();

  const [ownedBooks, rentedBooks] = await Promise.all([
    prisma.accessGrant.findMany({
      where: {
        userId: user.id,
        type: AccessGrantType.PURCHASE,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      include: {
        book: {
          select: {
            id: true,
            slug: true,
            titleAr: true,
          },
        },
      },
    }),
    prisma.accessGrant.findMany({
      where: {
        userId: user.id,
        type: AccessGrantType.RENTAL,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "asc" },
      include: {
        book: {
          select: {
            id: true,
            slug: true,
            titleAr: true,
          },
        },
      },
    }),
  ]);

  return (
    <main>
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">مكتبتي</h1>
          <p className="text-sm text-slate-600">الكتب المملوكة والكتب المستأجرة حالياً لحسابك.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">الكتب المملوكة</h2>
            {ownedBooks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">لا توجد كتب مملوكة بعد.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {ownedBooks.map((grant) => (
                  <li key={grant.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{grant.book.titleAr}</p>
                    <p className="mt-1 text-xs text-slate-500">تمت الإضافة في {formatArabicDate(grant.createdAt)}</p>
                    <Link href={`/reader/${grant.id}`} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-600">
                      قراءة الكتاب
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">الكتب المستأجرة حالياً</h2>
            {rentedBooks.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">لا توجد إعارات نشطة حالياً.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {rentedBooks.map((grant) => (
                  <li key={grant.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{grant.book.titleAr}</p>
                    <p className="mt-1 text-sm font-semibold text-amber-700">
                      تاريخ الانتهاء: {grant.expiresAt ? formatArabicDate(grant.expiresAt, { timeStyle: "short" }) : "غير محدد"}
                    </p>
                    {grant.expiresAt ? (
                      <p className="mt-1 text-xs text-slate-500">متبقي {getRemainingDays(grant.expiresAt)} يوم</p>
                    ) : null}
                    <Link href={`/reader/${grant.id}`} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-600">
                      فتح القارئ
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
