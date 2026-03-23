import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";

const users = [
  { id: "usr_31", name: "هالة محمد", email: "hala@example.com", role: "قارئ", status: "نشط" },
  { id: "usr_32", name: "مدير المنصة", email: "admin@example.com", role: "مشرف", status: "نشط" },
  { id: "usr_33", name: "ليث صالح", email: "laith@example.com", role: "قارئ", status: "معلق" },
];

export default function AdminUsersPage() {
  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المستخدمين" description="عرض المستخدمين وأدوارهم وحالة الحسابات." />
      <AdminTable
        caption="جدول المستخدمين"
        rows={users}
        getRowKey={(row) => row.id}
        columns={[
          { key: "name", title: "الاسم", render: (row) => row.name },
          { key: "email", title: "البريد الإلكتروني", render: (row) => row.email },
          { key: "role", title: "الدور", render: (row) => row.role },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </AdminPageCard>
  );
}
