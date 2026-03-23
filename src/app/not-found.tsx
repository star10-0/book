import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-indigo-700">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">الصفحة غير موجودة</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        ربما تم نقل الصفحة أو حذفها. يمكنك العودة إلى الصفحة الرئيسية أو متابعة تصفح الكتب.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          الصفحة الرئيسية
        </Link>
        <Link href="/books" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          تصفح الكتب
        </Link>
      </div>
    </section>
  );
}
