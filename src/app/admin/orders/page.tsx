import { OrderStatus } from "@prisma/client";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { formatArabicCurrency } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

function orderStatusLabel(status: OrderStatus) {
  if (status === "PAID") return "مدفوع";
  if (status === "CANCELLED") return "ملغى";
  if (status === "REFUNDED") return "مسترجع";
  return "بانتظار التأكيد";
}

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة الطلبات" description="متابعة الطلبات وحالاتها المالية بشكل سريع." />
      <AdminTable
        caption="جدول الطلبات"
        rows={orders}
        getRowKey={(row) => row.id}
        emptyMessage="لا توجد طلبات حالياً. عند إنشاء طلبات من واجهة المتجر ستظهر هنا."
        columns={[
          { key: "id", title: "رقم الطلب", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
          {
            key: "user",
            title: "المستخدم",
            render: (row) => row.user.fullName?.trim() || row.user.email,
          },
          {
            key: "total",
            title: "الإجمالي",
            render: (row) => formatArabicCurrency(row.totalCents / 100, { currency: row.currency }),
          },
          {
            key: "status",
            title: "الحالة",
            render: (row) => orderStatusLabel(row.status),
          },
        ]}
      />
    </AdminPageCard>
  );
}
