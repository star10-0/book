import { SiteHeader } from "@/components/site-header";

export default function AdminPage() {
  return (
    <main>
      <SiteHeader />
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">لوحة الإدارة</h1>
        <p className="mt-3 text-slate-600">
          صفحة مبدئية لإدارة المحتوى والكتب. سيتم إضافة صلاحيات وإجراءات الإدارة لاحقًا.
        </p>
      </section>
    </main>
  );
}
