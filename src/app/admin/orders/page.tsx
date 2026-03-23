import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";

const orders = [
  { id: "ord_501", user: "هالة محمد", total: "45,000 ل.س", status: "مدفوع" },
  { id: "ord_502", user: "ليث صالح", total: "18,000 ل.س", status: "بانتظار التأكيد" },
  { id: "ord_503", user: "ديمة رزوق", total: "25,000 ل.س", status: "ملغى" },
];

export default function AdminOrdersPage() {
  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة الطلبات" description="متابعة الطلبات وحالاتها المالية بشكل سريع." />
      <AdminTable
        caption="جدول الطلبات"
        rows={orders}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد طلبات حالياً. عند إنشاء طلبات من واجهة المتجر ستظهر هنا."
        columns={[
          { key: "id", title: "رقم الطلب", render: (row) => row.id },
          { key: "user", title: "المستخدم", render: (row) => row.user },
          { key: "total", title: "الإجمالي", render: (row) => row.total },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </AdminPageCard>
  );
}
