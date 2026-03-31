"use client";

import { useEffect, useMemo, useRef } from "react";
import { parsePdfPageFromLocator, toPdfLocator } from "@/lib/reader/locator";
import { ReaderDocumentSource, ReaderTheme } from "@/lib/reader/types";

type ReaderControls = {
  next: () => void;
  previous: () => void;
};

type Point = [number, number];

type Stroke = {
  color: string;
  width: number;
  points: Point[];
};

type ReaderViewportProps = {
  source: ReaderDocumentSource | null;
  locator: string;
  theme: ReaderTheme;
  drawingStrokes?: Stroke[];
  drawingMode?: "navigate" | "draw" | "eraser";
  onLocationChange: (payload: { locator: string; progressPercent: number }) => void;
  onControlsReady: (controls: ReaderControls | null) => void;
  onAddStroke?: (stroke: Stroke) => void;
  onEraseLastStroke?: () => void;
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

export function ReaderViewport({
  source,
  locator,
  theme,
  drawingStrokes = [],
  drawingMode = "navigate",
  onLocationChange,
  onControlsReady,
  onAddStroke,
  onEraseLastStroke,
}: ReaderViewportProps) {
  const palette = useMemo(() => getViewerPalette(theme), [theme]);
  const currentPage = parsePdfPageFromLocator(locator);
  const totalPages = source?.kind === "PDF" && typeof source.pageCount === "number" && source.pageCount > 0 ? source.pageCount : null;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<Point[]>([]);

  useEffect(() => {
    if (!source || source.kind !== "PDF" || !source.publicUrl) {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    for (const stroke of drawingStrokes) {
      if (!stroke.points.length) {
        continue;
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      const [firstX, firstY] = stroke.points[0];
      ctx.moveTo(firstX * width, firstY * height);
      for (let i = 1; i < stroke.points.length; i += 1) {
        const [x, y] = stroke.points[i];
        ctx.lineTo(x * width, y * height);
      }
      ctx.stroke();
    }
  }, [drawingStrokes, locator]);

  if (!source) {
    return (
      <div className={`rounded-xl border p-8 text-center ${palette.wrapper} ${palette.frame}`}>
        <p className="text-sm font-semibold">لا يوجد محتوى قابل للقراءة لهذا الكتاب حالياً.</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">تمت إضافة بيانات الكتاب فقط. يجب رفع PDF/EPUB أو حفظ محتوى نصي أولاً.</p>
      </div>
    );
  }

  if (source.kind === "TEXT") {
    return (
      <article className={`max-h-[78vh] overflow-y-auto whitespace-pre-wrap rounded-xl border p-6 leading-8 ${palette.wrapper} ${palette.frame}`}>
        {source.textContent}
      </article>
    );
  }

  if (!source.publicUrl) {
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
    const annotationEnabled = drawingMode !== "navigate";

    return (
      <div className={`relative overflow-hidden rounded-xl border ${palette.frame}`}>
        <iframe
          key={`${source.publicUrl}-${currentPage}-${theme}`}
          title="قارئ PDF"
          src={`${source.publicUrl}#page=${currentPage}&view=FitH`}
          className={`h-[82vh] w-full ${palette.wrapper}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full ${annotationEnabled ? "pointer-events-auto" : "pointer-events-none"}`}
          onPointerDown={(event) => {
            if (drawingMode === "navigate") {
              return;
            }

            if (drawingMode === "eraser") {
              onEraseLastStroke?.();
              return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            currentStrokeRef.current = [[(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height]];
          }}
          onPointerMove={(event) => {
            if (drawingMode !== "draw" || !currentStrokeRef.current.length) {
              return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            currentStrokeRef.current.push([(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height]);
          }}
          onPointerUp={() => {
            if (drawingMode !== "draw" || currentStrokeRef.current.length < 2) {
              currentStrokeRef.current = [];
              return;
            }

            onAddStroke?.({ color: "#2563eb", width: 2, points: currentStrokeRef.current });
            currentStrokeRef.current = [];
          }}
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
        className={`h-[82vh] w-full ${palette.wrapper}`}
      />
      <div className="border-t border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        تمت تهيئة EPUB كعرض أولي Placeholder عبر Web Viewer URL مع حفظ آخر موضع ({locator}). يمكن لاحقاً استبداله بمحرك
        EPUB.js دون تغيير واجهة الصفحة.
      </div>
    </div>
  );
}
