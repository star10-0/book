import Link from "next/link";
import { OfferType, UserRole } from "@prisma/client";
import { publishStudioBookAction, unpublishStudioBookAction } from "@/app/studio/actions";
import { requireCreator } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

function mapStatus(status: string) {
  if (status === "PUBLISHED") return "منشور";
  if (status === "PENDING_REVIEW") return "بانتظار المراجعة";
  if (status === "REJECTED") return "مرفوض";
  if (status === "ARCHIVED") return "مؤرشف";
  return "مسودة";
}

export default async function StudioBooksPage() {
  const user = await requireCreator({ callbackUrl: "/studio/books" });

  const books = await prisma.book.findMany({
    where: user.role === UserRole.ADMIN ? {} : { creatorId: user.id },
    include: {
      offers: {
        where: {
          type: {
            in: [OfferType.PURCHASE, OfferType.RENTAL],
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">كتبي</h2>
        <Link href="/studio/books/new" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
          أضف كتابًا
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-right text-slate-600">
              <th className="px-3 py-2">العنوان</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">الشراء</th>
              <th className="px-3 py-2">الإيجار</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => {
              const buy = book.offers.find((offer) => offer.type === OfferType.PURCHASE);
              const rent = book.offers.find((offer) => offer.type === OfferType.RENTAL);

              return (
                <tr key={book.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">{book.titleAr}</td>
                  <td className="px-3 py-3 text-slate-700">{mapStatus(book.status)}</td>
                  <td className="px-3 py-3 text-slate-700">{buy ? `${(buy.priceCents / 100).toLocaleString("ar-SY")} ل.س` : "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{rent ? `${(rent.priceCents / 100).toLocaleString("ar-SY")} ل.س` : "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link className="text-slate-700 underline underline-offset-2" href={`/studio/books/${book.id}/edit`}>
                        تعديل
                      </Link>
                      <form action={book.status === "PUBLISHED" ? unpublishStudioBookAction : publishStudioBookAction}>
                        <input type="hidden" name="bookId" value={book.id} />
                        <button type="submit" className="text-indigo-700 underline underline-offset-2">
                          {book.status === "PUBLISHED" ? "إلغاء النشر" : "نشر"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
