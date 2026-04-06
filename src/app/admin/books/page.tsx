import Link from "next/link";
import { OfferType } from "@prisma/client";
import { deleteBookAction, publishBookAction, unpublishBookAction } from "@/app/admin/books/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { loadContentOperationsSnapshot, type ContentOperationalBook, type ContentOperationalSignal } from "@/lib/admin/content-operations";
import { requireAdminScope } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const signalLabels: Record<ContentOperationalSignal, string> = {
  missing_cover: "غلاف مفقود",
  missing_file: "ملف قراءة مفقود",
  missing_active_offer: "عرض/سعر مفعل مفقود",
  missing_author_link: "ربط مؤلف مفقود",
  missing_category_link: "ربط تصنيف مفقود",
  pending_review: "بانتظار المراجعة",
  published_incomplete_metadata: "بيانات وصفية غير مكتملة",
  broken_access_readiness: "جاهزية وصول معطوبة",
};

function mapStatus(status: string) {
  if (status === "PUBLISHED") return "منشور";
  if (status === "PENDING_REVIEW") return "بانتظار المراجعة";
  if (status === "REJECTED") return "مرفوض";
  if (status === "ARCHIVED") return "مؤرشف";
  return "مسودة";
}

function mapOfferState(active: boolean) {
  return active ? "مفعل" : "متوقف";
}

function getQueueFilteredBookIds(scope: string | undefined, snapshot: Awaited<ReturnType<typeof loadContentOperationsSnapshot>>) {
  if (scope === "content-review") {
    return new Set(snapshot.queues.review.map((book) => book.id));
  }

  if (scope === "broken") {
    return new Set(snapshot.queues.broken.map((book) => book.id));
  }

  if (scope === "incomplete-metadata") {
    return new Set(snapshot.queues.incompleteMetadata.map((book) => book.id));
  }

  return null;
}

function renderSignals(book: ContentOperationalBook) {
  if (book.signals.length === 0) {
    return <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">جاهز</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {book.signals.map((signal) => (
        <span key={`${book.id}-${signal}`} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
          {signalLabels[signal]}
        </span>
      ))}
    </div>
  );
}

type AdminBooksPageProps = {
  searchParams?: Promise<{ status?: string; scope?: string }>;
};

export default async function AdminBooksPage({ searchParams }: AdminBooksPageProps) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/books" });
  const query = searchParams ? await searchParams : undefined;

  const [books, opsSnapshot] = await Promise.all([
    prisma.book.findMany({
      include: {
        author: {
          select: {
            nameAr: true,
          },
        },
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
    }),
    loadContentOperationsSnapshot(),
  ]);

  const queueBookIds = getQueueFilteredBookIds(query?.scope, opsSnapshot);
  const statusFilter = query?.status;

  const visibleBooks = books.filter((book) => {
    if (statusFilter && book.status !== statusFilter) {
      return false;
    }

    if (queueBookIds && !queueBookIds.has(book.id)) {
      return false;
    }

    return true;
  });

  const opsByBookId = new Map(opsSnapshot.books.map((book) => [book.id, book]));

  return (
    <AdminPageCard>
      <AdminPageHeader
        title="إدارة الكتب"
        description="إدارة كاملة للكتب مع حالة النشر وعروض الشراء والإيجار الرقمية."
        action={{ href: "/admin/books/new", label: "إضافة كتاب" }}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/books?scope=content-review" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">صف مراجعة المحتوى</p>
          <p className="mt-2 text-2xl font-bold text-indigo-800">{opsSnapshot.queues.review.length.toLocaleString("ar-SY")}</p>
        </Link>
        <Link href="/admin/books?scope=broken" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">صف المحتوى المعطوب</p>
          <p className="mt-2 text-2xl font-bold text-rose-800">{opsSnapshot.queues.broken.length.toLocaleString("ar-SY")}</p>
        </Link>
        <Link href="/admin/books?scope=incomplete-metadata" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">صف بيانات ناقصة</p>
          <p className="mt-2 text-2xl font-bold text-amber-800">{opsSnapshot.queues.incompleteMetadata.length.toLocaleString("ar-SY")}</p>
        </Link>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">إشارات الجودة التشغيلية</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {(Object.keys(signalLabels) as ContentOperationalSignal[]).map((signal) => (
            <span key={signal} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
              {signalLabels[signal]}: {opsSnapshot.counts[signal].toLocaleString("ar-SY")}
            </span>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-sm font-medium text-indigo-900">لبدء إضافة كتاب جديد، اضغط زر «إضافة كتاب» ثم أكمل نموذج البيانات.</p>
        <Link
          href="/admin/books/new"
          className="mt-3 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          + إضافة كتاب الآن
        </Link>
      </div>

      <AdminTable
        caption="جدول الكتب"
        rows={visibleBooks}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد كتب مطابقة للحالة/الصف المختار حالياً."
        emptyAction={{ href: "/admin/books/new", label: "إضافة كتاب" }}
        columns={[
          { key: "title", title: "الكتاب", render: (row) => row.titleAr },
          { key: "author", title: "المؤلف", render: (row) => row.author.nameAr },
          { key: "publicationStatus", title: "حالة النشر", render: (row) => mapStatus(row.status) },
          {
            key: "operationalSignals",
            title: "حالة التشغيل",
            render: (row) => renderSignals(opsByBookId.get(row.id) ?? { id: row.id, signals: [], titleAr: row.titleAr, slug: row.slug, status: row.status, format: row.format, authorName: row.author.nameAr, categoryName: null, createdAt: row.createdAt }),
          },
          {
            key: "buyOffer",
            title: "عرض الشراء",
            render: (row) => {
              const offer = row.offers.find((entry) => entry.type === OfferType.PURCHASE);
              return offer ? `${mapOfferState(offer.isActive)} - ${(offer.priceCents / 100).toLocaleString("ar-SY")} ل.س` : "غير متاح";
            },
          },
          {
            key: "rentOffer",
            title: "عرض الإيجار",
            render: (row) => {
              const offer = row.offers.find((entry) => entry.type === OfferType.RENTAL);
              return offer ? `${mapOfferState(offer.isActive)} - ${(offer.priceCents / 100).toLocaleString("ar-SY")} ل.س` : "غير متاح";
            },
          },
          {
            key: "actions",
            title: "إجراءات",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Link className="text-slate-700 underline underline-offset-2 hover:text-slate-900" href={`/admin/books/${row.id}/edit`}>
                  تعديل
                </Link>

                <form action={row.status === "PUBLISHED" ? unpublishBookAction : publishBookAction}>
                  <input type="hidden" name="bookId" value={row.id} />
                  <button type="submit" className="text-indigo-700 underline underline-offset-2 hover:text-indigo-500">
                    {row.status === "PUBLISHED" ? "إلغاء النشر" : "نشر"}
                  </button>
                </form>

                <form action={deleteBookAction}>
                  <input type="hidden" name="bookId" value={row.id} />
                  <input name="deleteReason" required minLength={8} className="w-36 rounded border px-1 py-0.5 text-[11px]" placeholder="سبب الحذف" />
                  <input name="confirmationText" required className="w-20 rounded border px-1 py-0.5 text-[11px]" placeholder="اكتب DELETE" />
                  <button type="submit" className="text-rose-700 underline underline-offset-2 hover:text-rose-500">
                    حذف
                  </button>
                </form>
              </div>
            ),
          },
        ]}
      />
    </AdminPageCard>
  );
}
