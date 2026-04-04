import { notFound } from "next/navigation";
import {
  adminForceLogoutAllDevicesAction,
  banUserAction,
  forcePasswordResetAction,
  requireTrustedDeviceRebindAction,
  revokeTrustedDeviceAction,
  unbanUserAction,
} from "@/app/admin/users/actions";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { getAdminUserDetails } from "@/lib/admin/users-directory";
import { suspiciousSecurityEventTypes } from "@/lib/admin/security-signals";
import { formatArabicDate } from "@/lib/formatters/intl";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const { userId } = await params;
  const user = await getAdminUserDetails(userId);

  if (!user) notFound();

  const suspiciousEvents = user.securityEvents.filter((event) => suspiciousSecurityEventTypes.includes(event.type as (typeof suspiciousSecurityEventTypes)[number]));

  return (
    <div className="space-y-4" dir="rtl">
      <AdminPageCard>
        <AdminPageHeader title={`المستخدم: ${user.email}`} description="تفاصيل أمن الحساب، ملخص المدفوعات، وسجل إجراءات الإدارة." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>الاسم: {user.fullName || "—"}</p>
          <p>الدور: {user.role}</p>
          <p>الحالة: {user.isActive ? "نشط" : "محظور"}</p>
          <p>سبب الحظر: {user.bannedReason || "—"}</p>
          <p>آخر نشاط: {user.lastSeenAt ? formatArabicDate(user.lastSeenAt, { dateStyle: "short", timeStyle: "short" }) : "—"}</p>
          <p>يتطلب إعادة تعيين كلمة المرور: {user.requirePasswordReset ? "نعم" : "لا"}</p>
          <p>نسخة الجلسة الحالية: {user.sessionVersion.toLocaleString("ar-SY")}</p>
          <p>عدد الأجهزة الموثوقة: {user.trustedDevicesCount.toLocaleString("ar-SY")}</p>
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
          <form action={requireTrustedDeviceRebindAction}>
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="reason" value="details page require device rebind" />
            <button className="rounded border px-3 py-1" type="submit">فرض إعادة ربط الجهاز</button>
          </form>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="ملخص الطلبات والمدفوعات والوصول" description="مرجع سريع قبل تنفيذ إجراءات التقييد أو الاستعادة على الحساب." />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>إجمالي الطلبات: {user.ordersCount.toLocaleString("ar-SY")}</p>
          <p>إجمالي محاولات الدفع (آخر 50): {user.paymentSummary.total.toLocaleString("ar-SY")}</p>
          <p>مدفوعات ناجحة: {user.paymentSummary.succeeded.toLocaleString("ar-SY")}</p>
          <p>مدفوعات قيد المتابعة: {user.paymentSummary.pending.toLocaleString("ar-SY")}</p>
          <p>مدفوعات فاشلة: {user.paymentSummary.failed.toLocaleString("ar-SY")}</p>
          <p>إجمالي المنح/الكتب المملوكة: {user.accessGrantsCount.toLocaleString("ar-SY")}</p>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="الأجهزة الموثوقة" description="إدارة الأجهزة الحالية مع مساحة واضحة للتوسعة المستقبلية (تصنيف الثقة/المخاطر)." />
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
        <AdminPageHeader title="حالة الأمان والتدقيق" description="ملخص أحداث الأمن وسجل إجراءات المشرفين المتعلقة بالمستخدم." />
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
            <h3 className="font-semibold">محاولات مشبوهة (أجهزة غير موثوقة)</h3>
            <p className="text-slate-700">العدد ضمن آخر الأحداث: {user.suspiciousEventsCount.toLocaleString("ar-SY")}</p>
            {suspiciousEvents.slice(0, 8).map((event) => (
              <p key={event.id} className="rounded border p-2">
                {event.type} — {event.ipAddress || "IP غير متاح"} — {formatArabicDate(event.createdAt, { dateStyle: "short", timeStyle: "short" })}
              </p>
            ))}
            {suspiciousEvents.length === 0 ? <p className="text-slate-600">لا توجد محاولات مشبوهة حديثة.</p> : null}
          </section>
          <section className="space-y-2 text-sm md:col-span-2">
            <h3 className="font-semibold">آخر إجراءات المشرفين</h3>
            {user.adminAuditLogs.slice(0, 8).map((entry) => (
              <p key={entry.id} className="rounded border p-2">
                {entry.action} — {entry.actorAdminEmail} — {formatArabicDate(entry.createdAt, { dateStyle: "short", timeStyle: "short" })}
              </p>
            ))}
            {user.adminAuditLogs.length === 0 ? <p className="text-slate-600">لا توجد سجلات تدقيق بعد.</p> : null}
          </section>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="مساحات مستقبلية" description="أماكن محجوزة لتفاصيل الأجهزة الموثوقة وتحليلات النشاط المشبوه المتقدمة." />
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <section className="rounded border border-dashed p-3 text-slate-600">Trusted Device Timeline (placeholder)</section>
          <section className="rounded border border-dashed p-3 text-slate-600">Suspicious Activity Investigation Queue (placeholder)</section>
        </div>
      </AdminPageCard>
    </div>
  );
}
