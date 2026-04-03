import { notFound } from "next/navigation";
import {
  adminForceLogoutAllDevicesAction,
  banUserAction,
  forcePasswordResetAction,
  revokeTrustedDeviceAction,
  unbanUserAction,
} from "@/app/admin/users/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { formatArabicDate } from "@/lib/formatters/intl";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      trustedDevices: { orderBy: { lastSeenAt: "desc" }, take: 20 },
      securityEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      paymentAttempts: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, createdAt: true } },
      adminAuditLogs: { orderBy: { createdAt: "desc" }, take: 20, include: { actorAdmin: { select: { email: true } } } },
      _count: { select: { orders: true, accessGrants: true } },
    },
  });

  if (!user) notFound();

  return (
    <div className="space-y-4" dir="rtl">
      <AdminPageCard>
        <AdminPageHeader title={`المستخدم: ${user.email}`} description="تفاصيل أمن الحساب والأجهزة الموثوقة وسجل الإجراءات الحساسة." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>الاسم: {user.fullName || "—"}</p><p>الدور: {user.role}</p>
          <p>الحالة: {user.isActive ? "نشط" : "محظور"}</p><p>آخر نشاط: {user.lastSeenAt ? formatArabicDate(user.lastSeenAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
          <p>عدد الطلبات: {user._count.orders.toLocaleString("ar-SY")}</p><p>الوصولات: {user._count.accessGrants.toLocaleString("ar-SY")}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <form action={user.isActive ? banUserAction : unbanUserAction}><input type="hidden" name="targetUserId" value={user.id} /><input type="hidden" name="reason" value="details page moderation" /><button className="rounded border px-3 py-1">{user.isActive ? "حظر الحساب" : "رفع الحظر"}</button></form>
          <form action={adminForceLogoutAllDevicesAction}><input type="hidden" name="targetUserId" value={user.id} /><input type="hidden" name="reason" value="details page force logout" /><button className="rounded border px-3 py-1">إنهاء كل الجلسات</button></form>
          <form action={forcePasswordResetAction}><input type="hidden" name="targetUserId" value={user.id} /><input type="hidden" name="reason" value="details page force password reset" /><button className="rounded border px-3 py-1">فرض إعادة تعيين كلمة المرور</button></form>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="الأجهزة الموثوقة" description="إدارة الجهاز الأساسي وإلغاء الأجهزة المشبوهة." />
        <div className="space-y-2 text-sm">
          {user.trustedDevices.map((d) => (
            <article key={d.id} className="rounded border p-3">
              <p>الجهاز: {d.label || d.userAgent || "غير معروف"}</p>
              <p>IP: {d.ipAddress || "—"}</p>
              <p>آخر ظهور: {formatArabicDate(d.lastSeenAt, { dateStyle: "short", timeStyle: "short" })}</p>
              <p>الحالة: {d.revokedAt ? "ملغى" : d.isPrimary ? "أساسي" : "موثوق"}</p>
              {!d.revokedAt ? <form className="mt-2" action={revokeTrustedDeviceAction}><input type="hidden" name="targetUserId" value={user.id} /><input type="hidden" name="deviceId" value={d.id} /><input type="hidden" name="reason" value="manual device revoke" /><button className="rounded border px-2 py-1 text-xs">إلغاء الجهاز</button></form> : null}
            </article>
          ))}
        </div>
      </AdminPageCard>
    </div>
  );
}
