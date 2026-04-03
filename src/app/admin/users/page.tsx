import Link from "next/link";
import { UserRole } from "@prisma/client";
import {
  adminForceLogoutAllDevicesAction,
  banUserAction,
  forcePasswordResetAction,
  unbanUserAction,
} from "@/app/admin/users/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

function roleLabel(role: UserRole) {
  if (role === "ADMIN") return "مشرف";
  if (role === "CREATOR") return "منشئ";
  return "قارئ";
}

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      lastSeenAt: true,
      _count: {
        select: {
          orders: true,
          accessGrants: true,
          trustedDevices: { where: { revokedAt: null, isTrusted: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المستخدمين" description="إدارة أمن الحسابات، الأجهزة الموثوقة، وإجراءات التعليق واستعادة الوصول." />
      <AdminTable
        caption="جدول المستخدمين"
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage="لا يوجد مستخدمون حالياً."
        columns={[
          { key: "email", title: "البريد", render: (row) => <Link className="font-semibold text-indigo-700" href={`/admin/users/${row.id}`}>{row.email}</Link> },
          { key: "name", title: "الاسم", render: (row) => row.fullName?.trim() || "—" },
          { key: "role", title: "الدور", render: (row) => roleLabel(row.role) },
          { key: "status", title: "الحالة", render: (row) => (row.isActive ? "نشط" : "محظور") },
          { key: "orders", title: "طلبات", render: (row) => row._count.orders.toLocaleString("ar-SY") },
          { key: "grants", title: "وصول", render: (row) => row._count.accessGrants.toLocaleString("ar-SY") },
          { key: "devices", title: "أجهزة نشطة", render: (row) => row._count.trustedDevices.toLocaleString("ar-SY") },
          {
            key: "lastSeen",
            title: "آخر نشاط",
            render: (row) => (row.lastSeenAt ? formatArabicDate(row.lastSeenAt, { dateStyle: "short", timeStyle: "short" }) : "—"),
          },
          {
            key: "actions",
            title: "إجراءات",
            render: (row) => (
              <div className="flex flex-wrap gap-2 text-xs">
                <form action={row.isActive ? banUserAction : unbanUserAction}>
                  <input type="hidden" name="targetUserId" value={row.id} />
                  <input type="hidden" name="reason" value={row.isActive ? "admin list action ban" : "admin list action unban"} />
                  <button className="rounded border border-slate-300 px-2 py-1" type="submit">{row.isActive ? "حظر" : "رفع الحظر"}</button>
                </form>
                <form action={adminForceLogoutAllDevicesAction}>
                  <input type="hidden" name="targetUserId" value={row.id} />
                  <input type="hidden" name="reason" value="admin force logout from users list" />
                  <button className="rounded border border-slate-300 px-2 py-1" type="submit">إنهاء كل الجلسات</button>
                </form>
                <form action={forcePasswordResetAction}>
                  <input type="hidden" name="targetUserId" value={row.id} />
                  <input type="hidden" name="reason" value="admin force password reset from users list" />
                  <button className="rounded border border-slate-300 px-2 py-1" type="submit">إجبار إعادة تعيين كلمة المرور</button>
                </form>
              </div>
            ),
          },
        ]}
      />
    </AdminPageCard>
  );
}
