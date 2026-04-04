import Link from "next/link";
import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { formatArabicDate } from "@/lib/formatters/intl";
import { loadAdminDashboardSnapshot } from "@/lib/admin/dashboard";

type HubSection = {
  href: string;
  title: string;
  description: string;
  badge?: string;
};

export default async function AdminDashboardPage() {
  const dashboard = await loadAdminDashboardSnapshot();

  const metrics = [
    { label: "إجمالي المستخدمين", value: dashboard.metrics.usersCount.toLocaleString("ar-SY") },
    { label: "المستخدمون المحظورون", value: dashboard.metrics.bannedUsersCount.toLocaleString("ar-SY") },
    { label: "إجمالي الكتب", value: dashboard.metrics.booksCount.toLocaleString("ar-SY") },
    { label: "كتب بانتظار المراجعة", value: dashboard.metrics.pendingBooksCount.toLocaleString("ar-SY") },
    { label: "كتب منشورة", value: dashboard.metrics.publishedBooksCount.toLocaleString("ar-SY") },
    { label: "طلبات اليوم", value: dashboard.metrics.todayOrdersCount.toLocaleString("ar-SY") },
    { label: "محاولات دفع اليوم", value: dashboard.metrics.todayPaymentsCount.toLocaleString("ar-SY") },
    { label: "سجلات تدقيق اليوم", value: dashboard.metrics.auditLogsTodayCount.toLocaleString("ar-SY") },
  ];

  const sections: HubSection[] = [
    { href: "/admin/users", title: "المستخدمون", description: "إدارة الحسابات، الحظر، وسياسات الوصول." },
    { href: "/admin/payments", title: "المدفوعات", description: "مراجعة محاولات الدفع والإجراءات التصحيحية." },
    { href: "/admin/orders", title: "الطلبات", description: "متابعة الطلبات والتسليم الرقمي للحالات التشغيلية." },
    { href: "/admin/orders", title: "نزاهة الطلبات", description: "فحص/استعادة اتساق الطلبات والدفع والمنح." },
    { href: "/admin/books", title: "الكتب", description: "مراجعة المحتوى والنشر والتحديثات." },
    { href: "/admin/curriculum", title: "المنهاج", description: "تنظيم المسارات التعليمية وربط الكتب بالمستويات." },
    { href: "/admin/promo-codes", title: "أكواد الخصم", description: "تشغيل الحملات ومراقبة الاستهلاك." },
    { href: "/admin/reports", title: "التقارير", description: "تنزيل تقارير CSV تشغيلية للأمان والدفع والمستخدمين." },
  ];

  const quickActions: HubSection[] = [
    { href: "/admin/users", title: "كل المستخدمين", description: "عرض أحدث الحسابات وإدارة الحالة." },
    { href: "/admin/users?scope=suspicious", title: "حسابات مشبوهة", description: "آخر الحسابات المرتبطة بمؤشرات أمان حساسة." },
    { href: "/admin/payments", title: "كل المدفوعات", description: "مركز شامل لحالة محاولات الدفع." },
    { href: "/admin/payments?scope=needs-review", title: "مدفوعات تحتاج مراجعة", description: "حالات PENDING/SUBMITTED/VERIFYING." },
    { href: "/admin/payments?scope=issues", title: "مشكلات دفع حديثة", description: "محاولات فاشلة أو عالقة في التحقق." },
    { href: "/admin/orders", title: "تحذيرات النزاهة", description: "حالات paid-without-grant وmismatch وpromo/rental." },
    { href: "/admin/books?status=PENDING_REVIEW", title: "صف مراجعة الكتب", description: "الوصول المباشر لمحتوى بانتظار الاعتماد." },
    { href: "/admin/reports", title: "التقارير", description: "تصدير المستخدمين والنشاط المشبوه وحوادث الدفع." },
  ];

  const alerts = [
    {
      title: "مدفوعات حرجة تحتاج تدخلاً",
      value: dashboard.alerts.criticalPaymentsNeedingReview,
      href: "/admin/payments?scope=issues",
      cta: "ابدأ الاستعادة الآن",
    },
    {
      title: "حسابات/أجهزة مشبوهة",
      value: dashboard.alerts.suspiciousAccountsOrDevices,
      href: "/admin/users?scope=suspicious",
      cta: "فتح قائمة الاشتباه",
    },
    {
      title: "شذوذ نزاهة يتطلب تدخل",
      value: dashboard.alerts.integrityAnomalies,
      href: "/admin/orders",
      cta: "معالجة الشذوذ",
    },
    {
      title: "إشارات مخاطر حرجة",
      value: dashboard.alerts.criticalRiskSignals,
      href: "/admin/payments?scope=issues",
      cta: "راجع إشارات المخاطر",
    },
    {
      title: "مدفوعات تحتاج مراجعة",
      value: dashboard.alerts.paymentsNeedingReview,
      href: "/admin/payments?scope=needs-review",
      cta: "فتح قائمة المراجعة",
    },
  ];

  return (
    <>
      <AdminPageCard>
        <AdminPageHeader
          title="مركز العمليات"
          description="لوحة تشغيل يومية لمتابعة المدفوعات، الأمان، المستخدمين، والمحتوى بسرعة ووضوح."
        />
      </AdminPageCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {alerts.map((alert) => (
          <article key={alert.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm text-amber-800">{alert.title}</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">{alert.value.toLocaleString("ar-SY")}</p>
            <Link href={alert.href} className="mt-3 inline-flex text-sm font-semibold text-amber-900 underline-offset-2 hover:underline">
              {alert.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
          </article>
        ))}
      </section>

      <AdminPageCard>
        <AdminPageHeader title="توصيات تشغيلية فورية" description="أعلى قوائم العمل ذات الأولوية مع خطوة تالية مقترحة." />
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="font-semibold text-rose-900">صف استعادة المدفوعات ({dashboard.reviewQueues.paymentRecoveryQueue.length.toLocaleString("ar-SY")})</p>
            <p className="mt-1 text-sm text-rose-800">الإجراء المقترح: ابدأ بالمحاولات العالقة ثم حالات تضارب المرجع.</p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">صف حسابات مشبوهة ({dashboard.reviewQueues.suspiciousUsersQueue.length.toLocaleString("ar-SY")})</p>
            <p className="mt-1 text-sm text-amber-800">الإجراء المقترح: مراجعة الأجهزة الموثوقة وتقييد الجلسات فوراً للحالات المتكررة.</p>
          </article>
          <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">صف محاولات أجهزة مشبوهة ({dashboard.reviewQueues.suspiciousDeviceAttemptsQueue.length.toLocaleString("ar-SY")})</p>
            <p className="mt-1 text-sm text-amber-800">الإجراء المقترح: تحقق هوية المستخدم ثم قرر إعادة الربط أو الحظر المؤقت.</p>
          </article>
          <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="font-semibold text-indigo-900">طلبات تحتاج تدخل ({dashboard.reviewQueues.ordersRequiringInterventionQueue.length.toLocaleString("ar-SY")})</p>
            <p className="mt-1 text-sm text-indigo-800">الإجراء المقترح: أصلح paid-without-grant أولاً ثم حالات mismatch المتبقية.</p>
          </article>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="صحة النظام" description="جاهزية التهيئة ومؤشرات الفشل والانحرافات الأساسية." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p className="rounded border p-3">سلامة البيئة: {dashboard.systemHealth.env.valid ? "سليم" : `أخطاء ${dashboard.systemHealth.env.errorCount.toLocaleString("ar-SY")}`}</p>
          <p className="rounded border p-3">فشل مدفوعات آخر 24 ساعة: {dashboard.systemHealth.criticalFailures.failedPaymentsLast24h.toLocaleString("ar-SY")}</p>
          <p className="rounded border p-3">تحقق عالق: {dashboard.systemHealth.criticalFailures.stuckVerifyingLast24h.toLocaleString("ar-SY")}</p>
          <p className="rounded border p-3">انجراف هجرات: {dashboard.systemHealth.drift.pendingOrFailedMigrations.toLocaleString("ar-SY")}</p>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {dashboard.systemHealth.providers.map((provider) => (
            <li key={provider.provider}>
              {provider.provider}: {provider.ready ? "جاهز" : `غير جاهز (${provider.missingEnvKeys.join(", ") || "missing env"})`} • mode={provider.mode}
            </li>
          ))}
        </ul>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="اختصارات سريعة" description="انتقل مباشرةً إلى أكثر المهام التشغيلية استخداماً." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((section) => (
            <Link
              key={`${section.href}-${section.title}`}
              href={section.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <p className="text-base font-semibold text-slate-900">{section.title}</p>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
            </Link>
          ))}
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="أقسام الإدارة" description="بوابة الوصول إلى جميع مناطق التشغيل والإدارة." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={`${section.href}-${section.title}`}
              href={section.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">{section.title}</p>
                {section.badge ? (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{section.badge}</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
            </Link>
          ))}
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="آخر الإجراءات الإدارية" description="آخر العمليات التي نفذها فريق الإدارة (للإشراف التشغيلي)." />
        {dashboard.recentAdminActions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">لا توجد إجراءات إدارية مسجلة حتى الآن.</p>
        ) : (
          <ul className="space-y-2">
            {dashboard.recentAdminActions.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{item.action}</p>
                <p className="text-xs text-slate-600">{item.actorEmail} • {formatArabicDate(item.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
                <p className="mt-1 text-xs text-slate-500">السبب: {item.reason || "—"}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="آخر أحداث الأمن المهمة" description="أحدث الأحداث عالية القيمة لمتابعة المخاطر بشكل استباقي." />
        {dashboard.recentSecurityActions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">لا توجد أحداث أمنية مهمة ضمن آخر 24 ساعة.</p>
        ) : (
          <ul className="space-y-2">
            {dashboard.recentSecurityActions.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{item.type}</p>
                <p className="text-xs text-slate-600">user: {item.userId}</p>
                <p className="mt-1 text-xs text-slate-500">{formatArabicDate(item.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminPageCard>
    </>
  );
}
