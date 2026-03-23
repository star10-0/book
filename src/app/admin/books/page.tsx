import Link from "next/link";

import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
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
    <AdminPageCard>
      <AdminPageHeader
        title="إدارة الكتب"
        description="قائمة مبدئية للكتب مع حالة النشر وإعدادات العروض."
        action={{ href: "/admin/books/new", label: "إضافة كتاب" }}
      />

      <AdminTable
        caption="جدول الكتب"
        rows={books}
        getRowKey={(row) => row.id}
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
    </AdminPageCard>
  );
}
