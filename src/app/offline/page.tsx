import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "غير متصل",
  description: "أنت غير متصل بالإنترنت حالياً. يمكنك المحاولة لاحقاً أو تصفح المحتوى المخزّن.",
};

export default function OfflinePage() {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-indigo-700">وضع عدم الاتصال</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">يبدو أنك غير متصل بالإنترنت</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        تأكد من اتصال الشبكة ثم أعد المحاولة. إذا كنت قد زرت الصفحة سابقًا، قد تتمكن من فتح بعض
        المحتوى المخزّن.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          العودة للرئيسية
        </Link>
        <Link href="/books" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          تصفح الكتب
        </Link>
      </div>
    </section>
  );
}
