"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getReaderEngine } from "@/lib/reader/engines";
import { ReaderDocumentSource, ReaderTheme } from "@/lib/reader/types";
import { ReaderToolbar } from "@/components/reader/reader-toolbar";
import { ReaderViewport } from "@/components/reader/reader-viewport";

type PublicReaderShellProps = {
  bookTitle: string;
  source: ReaderDocumentSource | null;
  returnHref: string;
};

export function PublicReaderShell({ bookTitle, source, returnHref }: PublicReaderShellProps) {
  const [locator, setLocator] = useState("page:1");
  const [progressPercent, setProgressPercent] = useState(0);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [controls, setControls] = useState<{ next: () => void; previous: () => void } | null>(null);

  const readerEngine = useMemo(() => getReaderEngine(source), [source]);
  const isUnavailable = !source || !readerEngine;

  return (
    <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
      <header className="space-y-1">
        <Link href={returnHref} className="inline-flex text-xs font-semibold text-indigo-700 hover:text-indigo-600">
          العودة إلى صفحة الكتاب
        </Link>
        <p className="text-xs font-medium text-indigo-600">قارئ الكتاب</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bookTitle}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {readerEngine ? `المحرّك: ${readerEngine.displayName}` : "لا يوجد ملف قراءة مدعوم لهذا الكتاب."}
        </p>
      </header>

      {isUnavailable ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          لا يوجد محتوى قابل للعرض الآن. جرّب لاحقًا أو ارجع إلى صفحة الكتاب للاطلاع على خيارات الوصول.
        </div>
      ) : (
        <>
          <ReaderToolbar
            progressText={`${progressPercent.toFixed(1)}%`}
            locator={locator}
            theme={theme}
            isSaving={false}
            saveError={null}
            canNavigate={Boolean(controls)}
            onNext={() => controls?.next()}
            onPrevious={() => controls?.previous()}
            onThemeChange={setTheme}
          />

          <ReaderViewport
            source={source}
            locator={locator}
            theme={theme}
            onLocationChange={(payload) => {
              setLocator(payload.locator);
              setProgressPercent(payload.progressPercent);
            }}
            onControlsReady={setControls}
          />
        </>
      )}
    </section>
  );
}
