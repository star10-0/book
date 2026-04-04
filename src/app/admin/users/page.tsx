import Link from "next/link";
import { Prisma, UserRole } from "@prisma/client";
import {
  adminForceLogoutAllDevicesAction,
  banUserAction,
  forcePasswordResetAction,
  unbanUserAction,
} from "@/app/admin/users/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { AdminTable } from "@/components/admin/admin-table";
import { suspiciousSecurityEventTypes } from "@/lib/admin/security-signals";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

function roleLabel(role: UserRole) {
  if (role === "ADMIN") return "مشرف";
  if (role === "CREATOR") return "منشئ";
  return "قارئ";
}

type UsersScope = "all" | "banned" | "suspicious";

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseScope(scopeValue?: string | string[]): UsersScope {
  const value = Array.isArray(scopeValue) ? scopeValue[0] : scopeValue;
  if (value === "banned" || value === "suspicious") return value;
  return "all";
}

async function resolveUsersWhere(scope: UsersScope): Promise<Prisma.UserWhereInput> {
  if (scope === "banned") {
    return { isActive: false };
  }

  if (scope === "suspicious") {
    const suspiciousEvents = await prisma.userSecurityEvent.findMany({
      where: {
        type: { in: suspiciousSecurityEventTypes },
      },
      select: { userId: true },
      orderBy: { createdAt: "desc" },
      take: 300,
      distinct: ["userId"],
    });

    if (suspiciousEvents.length === 0) {
      return { id: "__none__" };
    }

    return { id: { in: suspiciousEvents.map((event) => event.userId) } };
  }

  return {};
}

function scopeDescription(scope: UsersScope) {
  if (scope === "banned") {
    return "عرض الحسابات المحظورة لتسريع عمليات الاسترجاع أو المتابعة الأمنية.";
  }

  if (scope === "suspicious") {
    return "عرض الحسابات ذات المؤشرات الأمنية المشبوهة (أجهزة غير موثوقة/أنماط وصول غير طبيعية).";
  }

  return "إدارة أمن الحسابات، الأجهزة الموثوقة، وإجراءات التعليق واستعادة الوصول.";
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = searchParams ? await searchParams : {};
  const scope = parseScope(params.scope);

  const users = await prisma.user.findMany({
    where: await resolveUsersWhere(scope),
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
