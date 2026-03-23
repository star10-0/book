import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";

const categories = [
  { id: "cat_11", name: "روايات", booksCount: 42, status: "نشط" },
  { id: "cat_12", name: "تطوير ذات", booksCount: 28, status: "نشط" },
  { id: "cat_13", name: "تاريخ", booksCount: 11, status: "قيد المراجعة" },
];

export default function AdminCategoriesPage() {
  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة التصنيفات" description="عرض التصنيفات الحالية وعدد الكتب ضمن كل تصنيف." />
      <AdminTable
        caption="جدول التصنيفات"
        rows={categories}
        getRowKey={(row) => row.id}
        columns={[
          { key: "name", title: "التصنيف", render: (row) => row.name },
          { key: "booksCount", title: "عدد الكتب", render: (row) => row.booksCount },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </AdminPageCard>
  );
}
