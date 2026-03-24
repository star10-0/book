import Link from "next/link";
import { FileKind, OfferType } from "@prisma/client";
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

function buildReadiness(files: { kind: FileKind }[], textContent: string | null) {
  const kinds = new Set(files.map((file) => file.kind));
  const hasCover = kinds.has(FileKind.COVER_IMAGE);
  const hasFile = kinds.has(FileKind.PDF) || kinds.has(FileKind.EPUB);
  const hasText = Boolean(textContent?.trim());

  return [
    { label: "غلاف", done: hasCover },
    { label: "ملف", done: hasFile },
    { label: "نص", done: hasText },
  ];
}

export default async function StudioBooksPage() {
  const user = await requireCreator({ callbackUrl: "/studio/books" });

  const books = await prisma.book.findMany({
    where: { creatorId: user.id },
    include: {
      offers: {
        where: {
          type: {
            in: [OfferType.PURCHASE, OfferType.RENTAL],
          },
        },
      },
      files: {
        where: {
          kind: {
            in: [FileKind.COVER_IMAGE, FileKind.PDF, FileKind.EPUB],
          },
        },
        select: {
          kind: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir="rtl">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-semibold">رحلة إنشاء الكتاب: إنشاء البيانات أولًا ثم إكمال المحتوى من صفحة التعديل.</p>
        <p className="mt-1 text-xs">بعد إنشاء أي كتاب، افتح «تعديل» لإضافة: رفع الغلاف، رفع PDF، رفع EPUB، وكتابة المحتوى النصي.</p>
      </div>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">كتبي</h2>
        <Link href="/studio/books/new" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
          أضف كتابًا
        </Link>
      </div>

      {books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
          <p className="font-semibold">لا يوجد كتب مضافة بعد.</p>
          <p className="mt-1 text-xs text-slate-600">
            ابدأ بإنشاء كتاب جديد، ثم ستنتقل تلقائيًا إلى صفحة التعديل لإكمال المحتوى (الغلاف / PDF / EPUB / نص الكتاب).
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-right text-slate-600">
              <th className="px-3 py-2">العنوان</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">الشراء</th>
              <th className="px-3 py-2">الإيجار</th>
              <th className="px-3 py-2">جاهزية المحتوى</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => {
              const buy = book.offers.find((offer) => offer.type === OfferType.PURCHASE);
              const rent = book.offers.find((offer) => offer.type === OfferType.RENTAL);
              const readiness = buildReadiness(book.files, book.textContent);

              return (
                <tr key={book.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium text-slate-900">{book.titleAr}</td>
                  <td className="px-3 py-3 text-slate-700">{mapStatus(book.status)}</td>
                  <td className="px-3 py-3 text-slate-700">{buy ? `${(buy.priceCents / 100).toLocaleString("ar-SY")} ل.س` : "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{rent ? `${(rent.priceCents / 100).toLocaleString("ar-SY")} ل.س` : "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {readiness.map((item) => (
                        <span
                          key={`${book.id}-${item.label}`}
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${item.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </td>
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
      )}
    </section>
  );
}
