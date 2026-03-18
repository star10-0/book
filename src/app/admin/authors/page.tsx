import { AdminTable } from "@/components/admin/admin-table";

const authors = [
  { name: "مها العلي", booksCount: 6, status: "نشط" },
  { name: "أحمد شحادة", booksCount: 4, status: "نشط" },
  { name: "سارة حمود", booksCount: 2, status: "معلق" },
];

export default function AdminAuthorsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">إدارة المؤلفين</h2>
      <AdminTable
        caption="جدول المؤلفين"
        rows={authors}
        columns={[
          { key: "name", title: "الاسم", render: (row) => row.name },
          { key: "booksCount", title: "عدد الكتب", render: (row) => row.booksCount },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </section>
  );
}
