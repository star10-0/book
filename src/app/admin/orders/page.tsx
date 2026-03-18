import { AdminTable } from "@/components/admin/admin-table";

const orders = [
  { id: "ord_501", user: "هالة محمد", total: "45,000 ل.س", status: "مدفوع" },
  { id: "ord_502", user: "ليث صالح", total: "18,000 ل.س", status: "بانتظار التأكيد" },
  { id: "ord_503", user: "ديمة رزوق", total: "25,000 ل.س", status: "ملغى" },
];

export default function AdminOrdersPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">إدارة الطلبات</h2>
      <AdminTable
        caption="جدول الطلبات"
        rows={orders}
        columns={[
          { key: "id", title: "رقم الطلب", render: (row) => row.id },
          { key: "user", title: "المستخدم", render: (row) => row.user },
          { key: "total", title: "الإجمالي", render: (row) => row.total },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </section>
  );
}
