import { AdminPageCard, AdminPageHeader } from "@/components/admin/admin-page";
import Link from "next/link";

export default function AdminDashboardPage() {
  const metrics = [
    { label: "إجمالي الكتب", value: "128" },
    { label: "كتب منشورة", value: "94" },
    { label: "طلبات اليوم", value: "17" },
    { label: "مدفوعات قيد المراجعة", value: "6" },
  ];

  const adminSections = [
    { href: "/admin/books", title: "الكتب", description: "مراجعة جميع الكتب والإشراف على المحتوى." },
    { href: "/admin/authors", title: "المؤلفون", description: "متابعة ملفات المؤلفين والكتّاب." },
    { href: "/admin/categories", title: "التصنيفات", description: "تنظيم التصنيفات وربطها بالكتب." },
    { href: "/admin/orders", title: "الطلبات", description: "متابعة الطلبات وحالاتها." },
    { href: "/admin/payments", title: "المدفوعات", description: "مراجعة محاولات الدفع وحالتها." },
  ];

  return (
    <>
      <AdminPageCard>
        <AdminPageHeader
          title="نظرة عامة"
          description="لوحة المشرف مخصصة للمراجعة والإشراف العام على المنصة والمحتوى والمدفوعات."
        />
      </AdminPageCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
          </article>
        ))}
      </section>

      <AdminPageCard>
        <AdminPageHeader title="إجراءات الإشراف" description="الوصول المباشر لأدوات المراجعة والإشراف." />
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/books"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            إدارة الكتب
          </Link>
          <Link href="/admin/books/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            مراجعة الكتب
          </Link>
        </div>
      </AdminPageCard>

      <AdminPageCard>
        <AdminPageHeader title="روابط الإدارة الأساسية" description="اختر القسم المطلوب للوصول السريع إلى المهام اليومية." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <p className="text-base font-semibold text-slate-900">{section.title}</p>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
            </Link>
          ))}
        </div>
      </AdminPageCard>
    </>
  );
}
