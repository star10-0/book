import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";

const authors = [
  { id: "aut_21", name: "مها العلي", booksCount: 6, status: "نشط" },
  { id: "aut_22", name: "أحمد شحادة", booksCount: 4, status: "نشط" },
  { id: "aut_23", name: "سارة حمود", booksCount: 2, status: "معلق" },
];

export default function AdminAuthorsPage() {
  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المؤلفين" description="متابعة حالة المؤلفين وعدد الكتب المرتبطة بكل مؤلف." />
      <AdminTable
        caption="جدول المؤلفين"
        rows={authors}
        getRowKey={(row) => row.id}
        columns={[
          { key: "name", title: "الاسم", render: (row) => row.name },
          { key: "booksCount", title: "عدد الكتب", render: (row) => row.booksCount },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </AdminPageCard>
  );
}
