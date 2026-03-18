import { AdminTable } from "@/components/admin/admin-table";

const payments = [
  { id: "pay_771", method: "Mock Gateway", amount: "45,000 ل.س", status: "ناجحة" },
  { id: "pay_772", method: "Sham Cash (مستقبلي)", amount: "18,000 ل.س", status: "قيد المراجعة" },
  { id: "pay_773", method: "Syriatel Cash (مستقبلي)", amount: "25,000 ل.س", status: "فشل" },
];

export default function AdminPaymentsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">إدارة المدفوعات</h2>
      <AdminTable
        caption="جدول المدفوعات"
        rows={payments}
        columns={[
          { key: "id", title: "المعرف", render: (row) => row.id },
          { key: "method", title: "بوابة الدفع", render: (row) => row.method },
          { key: "amount", title: "المبلغ", render: (row) => row.amount },
          { key: "status", title: "الحالة", render: (row) => row.status },
        ]}
      />
    </section>
  );
}
