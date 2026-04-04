import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import { requireAdmin } from "@/lib/auth-session";

const reports = [
  {
    href: "/api/admin/reports/users",
    title: "تصدير المستخدمين",
    description: "CSV يتضمن البريد، الدور، نطاقات الإدارة، والحالة الأمنية الأساسية.",
  },
  {
    href: "/api/admin/reports/suspicious-activity",
    title: "تصدير النشاط المشبوه",
    description: "CSV لآخر أحداث الأمن الحساسة مع IP/UA والبيانات المرافقة.",
  },
  {
    href: "/api/admin/reports/failed-payments",
    title: "تصدير المدفوعات المتعثرة",
    description: "CSV لمحاولات FAILED أو VERIFYING العالقة للتدخل التشغيلي.",
  },
  {
    href: "/api/admin/reports/payment-incidents",
    title: "تصدير حوادث الدفع",
    description: "CSV لسجلات تدقيق تدخلات الدفع (reconcile/retry/lock release/force grant).",
  },
] as const;

export default async function AdminReportsPage() {
  await requireAdmin({ callbackUrl: "/admin/reports" });

  return (
    <AdminPageCard>
      <AdminPageHeader title="التقارير والتصدير" description="تنزيل تقارير تشغيلية بصيغة CSV لدعم المراجعة، الامتثال، والتحليل الخارجي." />
      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((report) => (
          <a
            key={report.href}
            href={report.href}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <p className="text-base font-semibold text-slate-900">{report.title}</p>
            <p className="mt-1 text-sm text-slate-600">{report.description}</p>
          </a>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">ملاحظة: كل عملية تنزيل تُسجّل تلقائياً في سجل التدقيق الإداري.</p>
    </AdminPageCard>
  );
}
