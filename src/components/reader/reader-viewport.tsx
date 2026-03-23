"use client";

import { useEffect, useMemo } from "react";
import { parsePdfPageFromLocator, toPdfLocator } from "@/lib/reader/locator";
import { ReaderDocumentSource, ReaderTheme } from "@/lib/reader/types";

type ReaderControls = {
  next: () => void;
  previous: () => void;
};

type ReaderViewportProps = {
  source: ReaderDocumentSource | null;
  locator: string;
  theme: ReaderTheme;
  onLocationChange: (payload: { locator: string; progressPercent: number }) => void;
  onControlsReady: (controls: ReaderControls | null) => void;
};

function getViewerPalette(theme: ReaderTheme) {
  if (theme === "dark") {
    return {
      wrapper: "bg-slate-900 text-slate-100",
      frame: "border-slate-700",
    };
  }

  return {
    wrapper: "bg-white text-slate-900",
    frame: "border-slate-200",
  };
}

export function ReaderViewport({ source, locator, theme, onLocationChange, onControlsReady }: ReaderViewportProps) {
  const palette = useMemo(() => getViewerPalette(theme), [theme]);
  const currentPage = parsePdfPageFromLocator(locator);
  const totalPages = source?.kind === "PDF" && typeof source.pageCount === "number" && source.pageCount > 0 ? source.pageCount : null;

  useEffect(() => {
    if (!source?.publicUrl || source.kind !== "PDF") {
      onControlsReady(null);
      return;
    }

    const toProgress = (page: number) => {
      if (!totalPages) {
        return 0;
      }

      return Math.min(100, (Math.max(1, page) / totalPages) * 100);
    };

    onControlsReady({
      next: () => {
        const nextPage = totalPages ? Math.min(totalPages, currentPage + 1) : currentPage + 1;
        onLocationChange({ locator: toPdfLocator(nextPage), progressPercent: toProgress(nextPage) });
      },
      previous: () => {
        const prevPage = Math.max(1, currentPage - 1);
        onLocationChange({ locator: toPdfLocator(prevPage), progressPercent: toProgress(prevPage) });
      },
    });
  }, [currentPage, onControlsReady, onLocationChange, source, totalPages]);

  if (!source?.publicUrl) {
    return (
      <div className={`rounded-xl border p-8 text-center ${palette.wrapper} ${palette.frame}`}>
        <p className="text-sm font-semibold">ملف القراءة غير متاح للعرض الآن.</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          تأكد من ربط publicUrl للملف أو إضافة مزود تخزين يدعم روابط قراءة مباشرة.
        </p>
      </div>
    );
  }

  if (source.kind === "PDF") {
    return (
      <div className={`overflow-hidden rounded-xl border ${palette.frame}`}>
        <iframe
          key={`${source.publicUrl}-${currentPage}-${theme}`}
          title="قارئ PDF"
          src={`${source.publicUrl}#page=${currentPage}&view=FitH`}
          className={`h-[70vh] w-full ${palette.wrapper}`}
        />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${palette.frame}`}>
      <iframe
        key={`${source.publicUrl}-${locator}-${theme}`}
        title="قارئ EPUB"
        src={source.publicUrl}
        className={`h-[70vh] w-full ${palette.wrapper}`}
      />
      <div className="border-t border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        تمت تهيئة EPUB كعرض أولي Placeholder عبر Web Viewer URL مع حفظ آخر موضع ({locator}). يمكن لاحقاً استبداله بمحرك
        EPUB.js دون تغيير واجهة الصفحة.
      </div>
    </div>
  );
}
