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

  useEffect(() => {
    if (!source?.publicUrl || source.kind !== "PDF") {
      onControlsReady(null);
      return;
    }

    onControlsReady({
      next: () => onLocationChange({ locator: toPdfLocator(currentPage + 1), progressPercent: 0 }),
      previous: () => onLocationChange({ locator: toPdfLocator(Math.max(1, currentPage - 1)), progressPercent: 0 }),
    });
  }, [currentPage, onControlsReady, onLocationChange, source]);

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
        تمت تهيئة EPUB عبر Web Viewer URL. يمكن لاحقاً استبداله بمحرك EPUB.js مع DRM/WATERMARK hooks دون تغيير واجهة الصفحة.
      </div>
    </div>
  );
}
