"use client";

import { useMemo, useState, useTransition } from "react";

type ReaderShellProps = {
  accessId: string;
  bookTitle: string;
  bookTypeLabel: "EPUB" | "PDF" | "غير متوفر";
  initialProgressPercent: number;
  initialLocator: string | null;
};

const STEP_PERCENT = 5;

function clampProgress(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function ReaderShell({
  accessId,
  bookTitle,
  bookTypeLabel,
  initialProgressPercent,
  initialLocator,
}: ReaderShellProps) {
  const [progressPercent, setProgressPercent] = useState(clampProgress(initialProgressPercent));
  const [locator, setLocator] = useState(initialLocator ?? "page:1");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const progressText = useMemo(() => `${progressPercent.toFixed(1)}%`, [progressPercent]);

  const persistProgress = (nextProgress: number, nextLocator: string) => {
    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/reading-progress/${accessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          progressPercent: nextProgress,
          locator: nextLocator,
        }),
      });

      if (!response.ok) {
        setError("تعذر حفظ التقدم. حاول مرة أخرى.");
      }
    });
  };

  const adjustProgress = (delta: number) => {
    const nextProgress = clampProgress(progressPercent + delta);
    const approxPage = Math.max(1, Math.ceil(nextProgress / 5));
    const nextLocator = `page:${approxPage}`;

    setProgressPercent(nextProgress);
    setLocator(nextLocator);
    persistProgress(nextProgress, nextLocator);
  };

  const handleSliderChange = (value: number) => {
    const nextProgress = clampProgress(value);
    const approxPage = Math.max(1, Math.ceil(nextProgress / 5));
    const nextLocator = `page:${approxPage}`;

    setProgressPercent(nextProgress);
    setLocator(nextLocator);
    persistProgress(nextProgress, nextLocator);
  };

  return (
    <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <header className="space-y-1">
        <p className="text-xs font-medium text-indigo-600">قارئ الكتاب</p>
        <h1 className="text-2xl font-bold text-slate-900">{bookTitle}</h1>
        <p className="text-sm text-slate-500">صيغة الملف: {bookTypeLabel}</p>
      </header>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-700">معاينة {bookTypeLabel}</p>
        <p className="mt-2 text-sm text-slate-500">سيتم ربط محرك عرض {bookTypeLabel} في إصدار لاحق.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">نسبة التقدم: {progressText}</p>
          <p className="text-xs text-slate-500">الموضع الحالي: {locator}</p>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={progressPercent}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          className="w-full accent-indigo-600"
          aria-label="تغيير نسبة التقدم في القراءة"
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => adjustProgress(STEP_PERCENT)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            الصفحة التالية
          </button>
          <button
            type="button"
            onClick={() => adjustProgress(-STEP_PERCENT)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            الصفحة السابقة
          </button>
        </div>

        {isPending ? <p className="text-xs text-slate-500">جارٍ حفظ التقدم...</p> : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
}
