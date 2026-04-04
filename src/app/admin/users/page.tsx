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
import { getAdminUsersList, parseUsersScope } from "@/lib/admin/users-directory";
import { requireAdminScope } from "@/lib/auth-session";

function roleLabel(role: UserRole) {
  if (role === "ADMIN") return "مشرف";
  if (role === "CREATOR") return "منشئ";
  return "قارئ";
}

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function scopeDescription(scope: ReturnType<typeof parseUsersScope>) {
  if (scope === "banned") {
    return "عرض الحسابات المحظورة لتسريع عمليات الاسترجاع أو المتابعة الأمنية.";
  }

  if (scope === "suspicious") {
    return "عرض الحسابات ذات المؤشرات الأمنية المشبوهة (أجهزة غير موثوقة/أنماط وصول غير طبيعية).";
  }

  return "إدارة أمن الحسابات، الأجهزة الموثوقة، وإجراءات التعليق واستعادة الوصول.";
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdminScope("SUPPORT_ADMIN", { callbackUrl: "/admin/users" });
  const params = searchParams ? await searchParams : {};
  const scope = parseUsersScope(params.scope);
  const users = await getAdminUsersList(scope);

  return (
    <AdminPageCard>
      <AdminPageHeader title="إدارة المستخدمين" description={scopeDescription(scope)} />
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/admin/users" className={`rounded border px-3 py-1.5 ${scope === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
          الكل
        </Link>
        <Link href="/admin/users?scope=banned" className={`rounded border px-3 py-1.5 ${scope === "banned" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
          محظورون
        </Link>
        <Link href="/admin/users?scope=suspicious" className={`rounded border px-3 py-1.5 ${scope === "suspicious" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>
          مشبوهون
        </Link>
      </div>
      <AdminTable
        caption="جدول المستخدمين"
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage="لا يوجد مستخدمون ضمن هذا النطاق حالياً."
        columns={[
          { key: "email", title: "البريد", render: (row) => <Link className="font-semibold text-indigo-700" href={`/admin/users/${row.id}`}>{row.email}</Link> },
          { key: "name", title: "الاسم", render: (row) => row.fullName?.trim() || "—" },
          { key: "role", title: "الدور", render: (row) => roleLabel(row.role) },
          { key: "status", title: "الحالة", render: (row) => (row.isActive ? "نشط" : "محظور") },
          { key: "orders", title: "طلبات", render: (row) => row.ordersCount.toLocaleString("ar-SY") },
          { key: "grants", title: "وصول", render: (row) => row.accessGrantsCount.toLocaleString("ar-SY") },
          { key: "trustedDevices", title: "أجهزة موثوقة", render: (row) => row.trustedDevicesCount.toLocaleString("ar-SY") },
          {
            key: "activeDevices",
            title: "أجهزة نشطة",
            render: (row) => (typeof row.activeDevicesCount === "number" ? row.activeDevicesCount.toLocaleString("ar-SY") : "—"),
          },
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
