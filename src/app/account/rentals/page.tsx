import Link from "next/link";
import { AccessGrantType } from "@prisma/client";
import { requireUser } from "@/lib/auth-session";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

function getRemainingDays(expiresAt: Date | null) {
  if (!expiresAt) {
    return null;
  }

  const diffMs = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export default async function AccountRentalsPage() {
  const user = await requireUser();
  const now = new Date();

  const rentals = await prisma.accessGrant.findMany({
    where: {
      userId: user.id,
      type: AccessGrantType.RENTAL,
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      book: {
        select: {
          id: true,
          slug: true,
          titleAr: true,
        },
      },
    },
  });

  return (
    <main>
      <section className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">إعاراتي</h1>
        </header>

        {rentals.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
            لا توجد إعارات بعد. يمكنك استئجار كتاب من صفحة الكتب.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rentals.map((rental) => {
              const isActive = rental.status === "ACTIVE" && (!rental.expiresAt || rental.expiresAt > now);
              const remainingDays = getRemainingDays(rental.expiresAt);

              return (
                <li key={rental.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold text-slate-900">{rental.book.titleAr}</h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isActive ? "نشطة" : "منتهية"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">بدأت في {formatArabicDate(rental.startsAt, { timeStyle: "short" })}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    تاريخ الانتهاء: {rental.expiresAt ? formatArabicDate(rental.expiresAt, { timeStyle: "short" }) : "غير محدد"}
                  </p>
                  {remainingDays !== null ? (
                    <p className="mt-1 text-xs text-slate-500">المدة المتبقية: {remainingDays} يوم</p>
                  ) : null}

                  <Link href={`/books/${rental.book.slug}`} className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-600">
                    فتح صفحة الكتاب
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
