import Link from "next/link";

import { AdminTable } from "@/components/admin/admin-table";

type BookRow = {
  id: string;
  title: string;
  author: string;
  publicationStatus: string;
  buyOffer: string;
  rentOffer: string;
};

const books: BookRow[] = [
  {
    id: "bk_101",
    title: "رحلة القارئ الذكي",
    author: "مها العلي",
    publicationStatus: "منشور",
    buyOffer: "مفعل",
    rentOffer: "مفعل",
  },
  {
    id: "bk_102",
    title: "أساسيات التفكير النقدي",
    author: "أحمد شحادة",
    publicationStatus: "مسودة",
    buyOffer: "مفعل",
    rentOffer: "متوقف",
  },
];

export default function AdminBooksPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">إدارة الكتب</h2>
          <p className="mt-1 text-sm text-slate-600">قائمة مبدئية للكتب مع حالة النشر وإعدادات العروض.</p>
        </div>
        <Link
          href="/admin/books/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
        >
          إضافة كتاب
        </Link>
      </div>

      <AdminTable
        caption="جدول الكتب"
        rows={books}
        columns={[
          { key: "title", title: "الكتاب", render: (row) => row.title },
          { key: "author", title: "المؤلف", render: (row) => row.author },
          { key: "publicationStatus", title: "حالة النشر", render: (row) => row.publicationStatus },
          { key: "buyOffer", title: "عرض الشراء", render: (row) => row.buyOffer },
          { key: "rentOffer", title: "عرض الإيجار", render: (row) => row.rentOffer },
          {
            key: "actions",
            title: "إجراءات",
            render: (row) => (
              <Link className="text-slate-700 underline underline-offset-2 hover:text-slate-900" href={`/admin/books/${row.id}/edit`}>
                تعديل
              </Link>
            ),
          },
        ]}
      />
    </section>
  );
}
