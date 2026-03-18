import { AdminTable } from "@/components/admin/admin-table";

const categories = [
  { name: "روايات", booksCount: 42, status: "نشط" },
  { name: "تطوير ذات", booksCount: 28, status: "نشط" },
  { name: "تاريخ", booksCount: 11, status: "قيد المراجعة" },
];

export default function AdminCategoriesPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">إدارة التصنيفات</h2>
      <AdminTable
        caption="جدول التصنيفات"
        rows={categories}
        columns={[
          { key: "name", title: "التصنيف", render: (row) => row.name },
          { key: "booksCount", title: "عدد الكتب", render: (row) => row.booksCount },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </section>
  );
}
