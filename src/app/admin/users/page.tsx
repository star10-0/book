import { AdminTable } from "@/components/admin/admin-table";

const users = [
  { name: "هالة محمد", email: "hala@example.com", role: "قارئ", status: "نشط" },
  { name: "مدير المنصة", email: "admin@example.com", role: "مشرف", status: "نشط" },
  { name: "ليث صالح", email: "laith@example.com", role: "قارئ", status: "معلق" },
];

export default function AdminUsersPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">إدارة المستخدمين</h2>
      <AdminTable
        caption="جدول المستخدمين"
        rows={users}
        columns={[
          { key: "name", title: "الاسم", render: (row) => row.name },
          { key: "email", title: "البريد الإلكتروني", render: (row) => row.email },
          { key: "role", title: "الدور", render: (row) => row.role },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </section>
  );
}
