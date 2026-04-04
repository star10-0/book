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
      paymentAttempts: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, status: true, createdAt: true } },
      adminAuditLogs: { orderBy: { createdAt: "desc" }, take: 20, include: { actorAdmin: { select: { email: true } } } },
      _count: { select: { orders: true, accessGrants: true } },
    },
  });

  if (!user) notFound();

  const paymentSummary = {
    pending: user.paymentAttempts.filter((item) => item.status === "PENDING" || item.status === "VERIFYING").length,
    succeeded: user.paymentAttempts.filter((item) => item.status === "PAID").length,
    failed: user.paymentAttempts.filter((item) => item.status === "FAILED").length,
  };

  return (
    <div className="space-y-4" dir="rtl">
      <AdminPageCard>
        <AdminPageHeader title={`المستخدم: ${user.email}`} description="تفاصيل أمن الحساب والأجهزة الموثوقة وسجل الإجراءات الحساسة." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>الاسم: {user.fullName || "—"}</p>
          <p>الدور: {user.role}</p>
          <p>الحالة: {user.isActive ? "نشط" : "محظور"}</p>
          <p>آخر نشاط: {user.lastSeenAt ? formatArabicDate(user.lastSeenAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
          <p>عدد الطلبات: {user._count.orders.toLocaleString("ar-SY")}</p>
          <p>الوصولات/المنح: {user._count.accessGrants.toLocaleString("ar-SY")}</p>
          <p>يتطلب إعادة تعيين كلمة المرور: {user.requirePasswordReset ? "نعم" : "لا"}</p>
          <p>نسخة الجلسة الحالية: {user.sessionVersion.toLocaleString("ar-SY")}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <form action={user.isActive ? banUserAction : unbanUserAction}>
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="reason" value="details page moderation" />
            <button className="rounded border px-3 py-1" type="submit">{user.isActive ? "حظر الحساب" : "رفع الحظر"}</button>
          </form>
          <form action={adminForceLogoutAllDevicesAction}>
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="reason" value="details page force logout" />
            <button className="rounded border px-3 py-1" type="submit">إنهاء كل الجلسات</button>
          </form>
          <form action={forcePasswordResetAction}>
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="reason" value="details page force password reset" />
            <button className="rounded border px-3 py-1" type="submit">فرض إعادة تعيين كلمة المرور</button>
          </form>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="ملخص الطلبات والمدفوعات" description="عرض تشغيلي سريع قبل تنفيذ أي إجراء إداري على الحساب." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>إجمالي الطلبات: {user._count.orders.toLocaleString("ar-SY")}</p>
          <p>إجمالي محاولات الدفع (آخر 50): {user.paymentAttempts.length.toLocaleString("ar-SY")}</p>
          <p>مدفوعات ناجحة: {paymentSummary.succeeded.toLocaleString("ar-SY")}</p>
          <p>مدفوعات قيد المتابعة: {paymentSummary.pending.toLocaleString("ar-SY")}</p>
          <p>مدفوعات فاشلة: {paymentSummary.failed.toLocaleString("ar-SY")}</p>
          <p>إجمالي المنح/الكتب المملوكة: {user._count.accessGrants.toLocaleString("ar-SY")}</p>
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
              {!d.revokedAt ? (
                <form className="mt-2" action={revokeTrustedDeviceAction}>
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <input type="hidden" name="deviceId" value={d.id} />
                  <input type="hidden" name="reason" value="manual device revoke" />
                  <button className="rounded border px-2 py-1 text-xs" type="submit">إلغاء الجهاز</button>
                </form>
              ) : null}
            </article>
          ))}
          {user.trustedDevices.length === 0 ? <p className="text-slate-600">لا توجد أجهزة موثوقة مسجلة حالياً.</p> : null}
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="حالة الأمان والتدقيق" description="مساحة لبيانات النشاط المشبوه وسجل التدقيق الإداري الحالي/المستقبلي." />
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2 text-sm">
            <h3 className="font-semibold">آخر أحداث الأمان</h3>
            {user.securityEvents.slice(0, 8).map((event) => (
              <p key={event.id} className="rounded border p-2">
                {event.type} — {formatArabicDate(event.createdAt, { dateStyle: "short", timeStyle: "short" })}
              </p>
            ))}
            {user.securityEvents.length === 0 ? <p className="text-slate-600">لا توجد أحداث أمان بعد.</p> : null}
          </section>
          <section className="space-y-2 text-sm">
            <h3 className="font-semibold">آخر إجراءات المشرفين</h3>
            {user.adminAuditLogs.slice(0, 8).map((entry) => (
              <p key={entry.id} className="rounded border p-2">
                {entry.action} — {entry.actorAdmin.email} — {formatArabicDate(entry.createdAt, { dateStyle: "short", timeStyle: "short" })}
              </p>
            ))}
            {user.adminAuditLogs.length === 0 ? <p className="text-slate-600">لا توجد سجلات تدقيق بعد.</p> : null}
          </section>
        </div>
      </AdminPageCard>
    </div>
  );
}
