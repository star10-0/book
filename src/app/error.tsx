"use client";

import { useEffect } from "react";
import Link from "next/link";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-slate-50 p-4 sm:p-8" role="alert" aria-live="assertive">
      <section className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-rose-700">حدث خطأ غير متوقع</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">تعذر تحميل الصفحة الآن</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          نعمل على معالجة المشكلة. جرّب إعادة المحاولة أو العودة إلى الصفحة الرئيسية.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            الصفحة الرئيسية
          </Link>
        </div>

        {process.env.NODE_ENV === "development" ? (
          <p className="mt-5 text-xs text-slate-500">{error.message}</p>
        ) : null}
      </section>
    </main>
  );
}
