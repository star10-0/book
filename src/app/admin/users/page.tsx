import { UserRole } from "@prisma/client";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { prisma } from "@/lib/prisma";

function roleLabel(role: UserRole) {
  if (role === "ADMIN") return "مشرف";
  if (role === "CREATOR") return "منشئ";
  return "قارئ";
}

function statusLabel(isActive: boolean) {
  return isActive ? "نشط" : "معلق";
}

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المستخدمين" description="عرض المستخدمين وأدوارهم وحالة الحسابات." />
      <AdminTable
        caption="جدول المستخدمين"
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage="لا يوجد مستخدمون حالياً."
        columns={[
          { key: "name", title: "الاسم", render: (row) => row.fullName?.trim() || "—" },
          { key: "email", title: "البريد الإلكتروني", render: (row) => row.email },
          { key: "role", title: "الدور", render: (row) => roleLabel(row.role) },
          { key: "status", title: "الحالة", render: (row) => statusLabel(row.isActive) },
        ]}
      />
    </AdminPageCard>
  );
}
