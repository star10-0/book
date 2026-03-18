import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BookNotFound() {
  return (
    <main>
      <SiteHeader />
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900">الكتاب غير موجود</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          قد يكون الرابط غير صحيح أو تم حذف الكتاب. يمكنك العودة إلى قائمة الكتب لاختيار عنوان آخر.
        </p>
        <Link
          href="/books"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          العودة إلى الكتب
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
