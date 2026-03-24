import Link from "next/link";
import { OfferType } from "@prisma/client";
import { deleteBookAction, publishBookAction, unpublishBookAction } from "@/app/admin/books/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { prisma } from "@/lib/prisma";

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

export default async function AdminBooksPage() {
  const books = await prisma.book.findMany({
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
  });

  return (
    <AdminPageCard>
      <AdminPageHeader
        title="إدارة الكتب"
        description="إدارة كاملة للكتب مع حالة النشر وعروض الشراء والإيجار الرقمية."
        action={{ href: "/admin/books/new", label: "إضافة كتاب" }}
      />
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
        rows={books}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد كتب بعد. ابدأ بإضافة أول كتاب ليظهر هنا."
        emptyAction={{ href: "/admin/books/new", label: "إضافة أول كتاب" }}
        columns={[
          { key: "title", title: "الكتاب", render: (row) => row.titleAr },
          { key: "author", title: "المؤلف", render: (row) => row.author.nameAr },
          { key: "publicationStatus", title: "حالة النشر", render: (row) => mapStatus(row.status) },
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
