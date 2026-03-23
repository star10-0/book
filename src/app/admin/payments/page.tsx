import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";

const payments = [
  { id: "pay_771", method: "Mock Gateway", amount: "45,000 ل.س", status: "ناجحة" },
  { id: "pay_772", method: "Sham Cash (مستقبلي)", amount: "18,000 ل.س", status: "قيد المراجعة" },
  { id: "pay_773", method: "Syriatel Cash (مستقبلي)", amount: "25,000 ل.س", status: "فشل" },
];

export default function AdminPaymentsPage() {
  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المدفوعات" description="مراجعة محاولات الدفع وحالتها عبر مزودي الدفع الحاليين والمستقبليين." />
      <AdminTable
        caption="جدول المدفوعات"
        rows={payments}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد محاولات دفع حالياً. ستظهر هنا تلقائياً بعد بدء عمليات الدفع."
        columns={[
          { key: "id", title: "المعرف", render: (row) => row.id },
          { key: "method", title: "بوابة الدفع", render: (row) => row.method },
          { key: "amount", title: "المبلغ", render: (row) => row.amount },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </AdminPageCard>
  );
}
