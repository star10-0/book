import { SiteHeader } from "@/components/site-header";

export default function BooksPage() {
  return (
    <main>
      <SiteHeader />
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">صفحة الكتب</h1>
        <p className="mt-3 text-slate-600">
          ستُعرض هنا قائمة الكتب الرقمية، مع خيارات الشراء والاستئجار في المراحل القادمة.
        </p>
      </section>
    </main>
  );
}
