"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getReaderEngine } from "@/lib/reader/engines";
import { normalizeProgress } from "@/lib/reader/locator";
import { ReaderDocumentSource, ReaderTheme } from "@/lib/reader/types";
import { ReaderToolbar } from "@/components/reader/reader-toolbar";
import { ReaderViewport } from "@/components/reader/reader-viewport";

type ReaderShellProps = {
  accessId: string;
  bookTitle: string;
  initialProgressPercent: number;
  initialLocator: string | null;
  source: ReaderDocumentSource | null;
  returnHref: string;
};

type ReaderControls = {
  next: () => void;
  previous: () => void;
};

type AnnotationType = "DRAWING" | "NOTE" | "BOOKMARK";
type AnnotationMode = "navigate" | "draw" | "eraser";

type ReaderAnnotation = {
  id: string;
  type: AnnotationType;
  locator: string;
  payload: unknown;
  updatedAt: string;
};

type Stroke = {
  color: string;
  width: number;
  points: [number, number][];
};

export function ReaderShell({ accessId, bookTitle, initialProgressPercent, initialLocator, source, returnHref }: ReaderShellProps) {
  const [progressPercent, setProgressPercent] = useState(normalizeProgress(initialProgressPercent));
  const [locator, setLocator] = useState(initialLocator ?? "page:1");
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [controls, setControls] = useState<ReaderControls | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>("navigate");
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [isNoteComposerOpen, setIsNoteComposerOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [annotationMessage, setAnnotationMessage] = useState<string | null>(null);
  const lastSavedRef = useRef<string>(`${normalizeProgress(initialProgressPercent)}|${initialLocator ?? "page:1"}`);

  const readerEngine = useMemo(() => getReaderEngine(source), [source]);
  const progressText = useMemo(() => `${progressPercent.toFixed(1)}%`, [progressPercent]);

  const notes = useMemo(() => annotations.filter((annotation) => annotation.type === "NOTE"), [annotations]);
  const bookmarks = useMemo(() => annotations.filter((annotation) => annotation.type === "BOOKMARK"), [annotations]);
  const currentDrawing = useMemo(() => {
    const drawing = annotations.find((annotation) => annotation.type === "DRAWING" && annotation.locator === locator);
    if (!drawing || !drawing.payload || typeof drawing.payload !== "object") {
      return [] as Stroke[];
    }

    const strokes = Array.isArray((drawing.payload as { strokes?: unknown }).strokes)
      ? ((drawing.payload as { strokes: unknown[] }).strokes as Stroke[])
      : [];

    return strokes;
  }, [annotations, locator]);

  const persistProgress = useCallback(
    async (nextProgress: number, nextLocator: string) => {
      const progressKey = `${nextProgress}|${nextLocator}`;

      if (progressKey === lastSavedRef.current) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
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
        } else {
          lastSavedRef.current = progressKey;
        }
      } catch {
        setError("تعذر حفظ التقدم. حاول مرة أخرى.");
      }

      setIsSaving(false);
    },
    [accessId],
  );

  const loadAnnotations = useCallback(async () => {
    try {
      const response = await fetch(`/api/reader-annotations/${accessId}`);
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { annotations?: ReaderAnnotation[] };
      setAnnotations(data.annotations ?? []);
    } catch {
      // no-op
    }
  }, [accessId]);

  useEffect(() => {
    void loadAnnotations();
  }, [loadAnnotations]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void persistProgress(progressPercent, locator);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [locator, persistProgress, progressPercent]);

  const createAnnotation = useCallback(
    async (type: AnnotationType, annotationLocator: string, payload: unknown) => {
      setAnnotationMessage(null);
      try {
        const response = await fetch(`/api/reader-annotations/${accessId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            type,
            locator: annotationLocator,
            payload,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          setAnnotationMessage(body?.message ?? "تعذر حفظ التعليق.");
          return;
        }

        const data = (await response.json()) as { annotation: ReaderAnnotation };
        setAnnotations((current) => {
          const withoutSameId = current.filter((annotation) => annotation.id !== data.annotation.id);
          return [data.annotation, ...withoutSameId];
        });
        setAnnotationMessage(type === "DRAWING" ? "تم حفظ الرسم." : "تم حفظ التعليق.");
      } catch {
        setAnnotationMessage("تعذر حفظ التعليق.");
      }
    },
    [accessId],
  );

  const handleLocationChange = useCallback(
    (payload: { locator: string; progressPercent: number }) => {
      setLocator(payload.locator);

      if (payload.progressPercent > 0) {
        setProgressPercent(normalizeProgress(payload.progressPercent));
      }
    },
    [],
  );

  const persistDrawingForLocator = useCallback(
    async (nextStrokes: Stroke[]) => {
      await createAnnotation("DRAWING", locator, {
        strokes: nextStrokes,
      });
    },
    [createAnnotation, locator],
  );

  const handleAddStroke = useCallback(
    (stroke: Stroke) => {
      const nextStrokes = [...currentDrawing, stroke];
      void persistDrawingForLocator(nextStrokes);
    },
    [currentDrawing, persistDrawingForLocator],
  );

  const handleEraseLastStroke = useCallback(() => {
    if (!currentDrawing.length) {
      return;
    }

    const nextStrokes = currentDrawing.slice(0, -1);
    void persistDrawingForLocator(nextStrokes);
  }, [currentDrawing, persistDrawingForLocator]);

  const handleClearCurrentDrawing = useCallback(() => {
    if (!currentDrawing.length) {
      return;
    }

    void persistDrawingForLocator([]);
  }, [currentDrawing.length, persistDrawingForLocator]);

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      setAnnotationMessage(null);
      const response = await fetch(`/api/reader-annotations/${accessId}?id=${encodeURIComponent(annotationId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setAnnotationMessage(body?.message ?? "تعذر حذف التعليق.");
        return;
      }

      setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId));
      setAnnotationMessage("تم حذف التعليق.");
    },
    [accessId],
  );

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800 lg:p-6">
      <header className="space-y-1">
        <Link href={returnHref} className="inline-flex text-xs font-semibold text-indigo-700 hover:text-indigo-600">
          العودة إلى مكتبتي
        </Link>
        <p className="text-xs font-medium text-indigo-600">قارئ الكتاب</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bookTitle}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {readerEngine ? `المحرّك: ${readerEngine.displayName}` : "لا يوجد ملف قراءة مدعوم لهذا الكتاب."}
        </p>
        {source && source.kind !== "TEXT" && source.isEncrypted ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            هذا الملف معلّم كمشفّر. نقطة تكامل DRM جاهزة عبر ReaderProtectionHooks.
          </p>
        ) : null}
      </header>

      <ReaderToolbar
        progressText={progressText}
        locator={locator}
        theme={theme}
        isSaving={isSaving}
        saveError={error}
        canNavigate={Boolean(controls)}
        annotationMode={annotationMode}
        notesCount={notes.length}
        bookmarksCount={bookmarks.length}
        onNext={() => controls?.next()}
        onPrevious={() => controls?.previous()}
        onThemeChange={setTheme}
        onAnnotationModeChange={setAnnotationMode}
        onAddBookmark={() => void createAnnotation("BOOKMARK", locator, { label: "" })}
        onOpenNotesPanel={() => setIsNotesPanelOpen((current) => !current)}
        onOpenNoteComposer={() => setIsNoteComposerOpen((current) => !current)}
        onClearCurrentLayer={handleClearCurrentDrawing}
      />

      {isNoteComposerOpen ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <label htmlFor="reader-note" className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            ملاحظة مرتبطة بالموضع الحالي ({locator})
          </label>
          <textarea
            id="reader-note"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!noteDraft.trim()) {
                  return;
                }

                void createAnnotation("NOTE", locator, { text: noteDraft.trim() });
                setNoteDraft("");
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              حفظ الملاحظة
            </button>
            <button
              type="button"
              onClick={() => setIsNoteComposerOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}

      {annotationMessage ? <p className="text-xs text-indigo-600">{annotationMessage}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ReaderViewport
          source={source}
          locator={locator}
          theme={theme}
          drawingMode={annotationMode}
          drawingStrokes={currentDrawing}
          onLocationChange={handleLocationChange}
          onControlsReady={setControls}
          onAddStroke={handleAddStroke}
          onEraseLastStroke={handleEraseLastStroke}
        />

        {isNotesPanelOpen ? (
          <aside className="max-h-[82vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">المراجع والملاحظات المحفوظة</h2>
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <button type="button" onClick={() => setLocator(bookmark.locator)} className="w-full text-right hover:underline">
                    علامة عند {bookmark.locator}
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void deleteAnnotation(bookmark.id)}
                      className="rounded-md border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-right text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <button type="button" onClick={() => setLocator(note.locator)} className="w-full text-right hover:underline">
                    <p className="font-semibold text-indigo-700 dark:text-indigo-300">{note.locator}</p>
                    <p className="mt-1 max-h-16 overflow-hidden">{typeof (note.payload as { text?: unknown })?.text === "string" ? (note.payload as { text: string }).text : "ملاحظة"}</p>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void deleteAnnotation(note.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
              {!notes.length && !bookmarks.length ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">لا توجد ملاحظات أو مراجع محفوظة بعد.</p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
