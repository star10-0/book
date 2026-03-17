import Link from "next/link";
import { AccessGrantType } from "@prisma/client";
import { SiteHeader } from "@/components/site-header";
import { getOrCreateDemoUser } from "@/lib/auth-demo-user";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

export default async function AccountLibraryPage() {
  const demoUser = await getOrCreateDemoUser();
  const now = new Date();

  const [ownedBooks, rentedBooks] = await Promise.all([
    prisma.accessGrant.findMany({
      where: {
        userId: demoUser.id,
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
        userId: demoUser.id,
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
      <SiteHeader />
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">مكتبتي</h1>
          <p className="text-sm text-slate-600">الكتب المملوكة والكتب المستأجرة حالياً للمستخدم التجريبي.</p>
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
                    <Link href={`/books/${grant.book.slug}`} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-600">
                      عرض الكتاب
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
                    <p className="mt-1 text-xs text-slate-500">
                      ينتهي الاستئجار في {grant.expiresAt ? formatArabicDate(grant.expiresAt) : "غير محدد"}
                    </p>
                    <Link href={`/books/${grant.book.slug}`} className="mt-3 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-600">
                      متابعة القراءة
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
