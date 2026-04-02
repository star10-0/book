"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getReaderEngine } from "@/lib/reader/engines";
import { normalizeProgress } from "@/lib/reader/locator";
import { ReaderDocumentSource, ReaderTheme } from "@/lib/reader/types";
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
type ReaderPanel = "contents" | "compose";

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

function extractNoteText(payload: unknown) {
  return typeof (payload as { text?: unknown })?.text === "string" ? (payload as { text: string }).text : "";
}

function extractBookmarkLabel(payload: unknown) {
  return typeof (payload as { label?: unknown })?.label === "string" ? (payload as { label: string }).label : "";
}

function clampZoom(zoom: number) {
  return Math.max(50, Math.min(200, zoom));
}

const ZOOM_STEP = 10;

export function ReaderShell({ accessId, bookTitle, initialProgressPercent, initialLocator, source, returnHref }: ReaderShellProps) {
  const [progressPercent, setProgressPercent] = useState(normalizeProgress(initialProgressPercent));
  const [locator, setLocator] = useState(initialLocator ?? "page:1");
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [controls, setControls] = useState<ReaderControls | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>("navigate");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ReaderPanel>("contents");
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [annotationMessage, setAnnotationMessage] = useState<string | null>(null);
  const [isAnnotationSaving, setIsAnnotationSaving] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const readerRootRef = useRef<HTMLElement | null>(null);
  const lastSavedRef = useRef<string>(`${normalizeProgress(initialProgressPercent)}|${initialLocator ?? "page:1"}`);

  const readerEngine = useMemo(() => getReaderEngine(source), [source]);
  const progressText = useMemo(() => `${progressPercent.toFixed(1)}%`, [progressPercent]);
  const isPdf = source?.kind === "PDF";

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

  const resolveProgressFromLocator = useCallback(
    (nextLocator: string) => {
      if (!source) {
        return progressPercent;
      }

      if (source.kind === "PDF" && typeof source.pageCount === "number" && source.pageCount > 0) {
        const pageMatch = /page:(\d+)/.exec(nextLocator);
        const page = pageMatch ? Number.parseInt(pageMatch[1], 10) : 1;
        const safePage = Number.isNaN(page) ? 1 : Math.min(source.pageCount, Math.max(1, page));
        return normalizeProgress((safePage / source.pageCount) * 100);
      }

      return progressPercent;
    },
    [progressPercent, source],
  );

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
      const response = await fetch(`/api/reader-annotations/${accessId}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
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

  useEffect(() => {
    const onFullScreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFocusMode(false);
      }
    };

    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  const createAnnotation = useCallback(
    async (type: AnnotationType, annotationLocator: string, payload: unknown) => {
      setAnnotationMessage(null);
      setIsAnnotationSaving(true);
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
          return false;
        }

        await loadAnnotations();
        setAnnotationMessage(type === "DRAWING" ? "تم حفظ الرسم." : type === "BOOKMARK" ? "تم حفظ المرجع." : "تم حفظ الملاحظة.");
        return true;
      } catch {
        setAnnotationMessage("تعذر حفظ التعليق.");
        return false;
      } finally {
        setIsAnnotationSaving(false);
      }
    },
    [accessId, loadAnnotations],
  );

  const updateAnnotation = useCallback(
    async (annotationId: string, payload: unknown) => {
      setAnnotationMessage(null);
      setIsAnnotationSaving(true);
      try {
        const response = await fetch(`/api/reader-annotations/${accessId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            id: annotationId,
            payload,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          setAnnotationMessage(body?.message ?? "تعذر تحديث التعليق.");
          return false;
        }

        await loadAnnotations();
        setAnnotationMessage("تم تحديث الملاحظة.");
        return true;
      } catch {
        setAnnotationMessage("تعذر تحديث التعليق.");
        return false;
      } finally {
        setIsAnnotationSaving(false);
      }
    },
    [accessId, loadAnnotations],
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      setAnnotationMessage(null);
      setIsAnnotationSaving(true);
      try {
        const response = await fetch(`/api/reader-annotations/${accessId}?id=${encodeURIComponent(annotationId)}`, {
          method: "DELETE",
          credentials: "same-origin",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          setAnnotationMessage(body?.message ?? "تعذر حذف التعليق.");
          return;
        }

        await loadAnnotations();
        setAnnotationMessage("تم حذف التعليق.");
      } catch {
        setAnnotationMessage("تعذر حذف التعليق.");
      } finally {
        setIsAnnotationSaving(false);
      }
    },
    [accessId, loadAnnotations],
  );

  const handleLocationChange = useCallback((payload: { locator: string; progressPercent: number }) => {
    setLocator(payload.locator);
    if (payload.progressPercent > 0) {
      setProgressPercent(normalizeProgress(payload.progressPercent));
    }
  }, []);

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

  const jumpToLocator = useCallback(
    (nextLocator: string) => {
      setLocator(nextLocator);
      setProgressPercent(resolveProgressFromLocator(nextLocator));
      setIsPanelOpen(false);
    },
    [resolveProgressFromLocator],
  );

  const saveNewNote = useCallback(async () => {
    const text = noteDraft.trim();
    if (!text) {
      return;
    }

    const success = await createAnnotation("NOTE", locator, { text });
    if (success) {
      setNoteDraft("");
      setActivePanel("contents");
      setIsPanelOpen(true);
      await loadAnnotations();
    }
  }, [createAnnotation, loadAnnotations, locator, noteDraft]);

  const saveEditedNote = useCallback(async () => {
    if (!editingNoteId || !editingDraft.trim()) {
      return;
    }

    const success = await updateAnnotation(editingNoteId, { text: editingDraft.trim() });
    if (success) {
      setEditingNoteId(null);
      setEditingDraft("");
      await loadAnnotations();
    }
  }, [editingDraft, editingNoteId, loadAnnotations, updateAnnotation]);

  const addBookmarkAtCurrentLocator = useCallback(async () => {
    await createAnnotation("BOOKMARK", locator, { label: `مرجع عند ${locator}` });
  }, [createAnnotation, locator]);

  const toggleFocusMode = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFocusMode(false);
      return;
    }

    const target = readerRootRef.current;
    if (target && target.requestFullscreen) {
      try {
        await target.requestFullscreen();
      } catch {
        setIsFocusMode((current) => !current);
        return;
      }
    }

    setIsFocusMode(true);
  }, []);

  const panel = (
    <aside
      className={`flex h-full flex-col overflow-hidden rounded-2xl border ${
        theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`flex items-center justify-between border-b px-3 py-2 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
        <h2 className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>الأدوات</h2>
        <button
          type="button"
          onClick={() => setIsPanelOpen(false)}
          className={`rounded-md px-2 py-1 text-xs lg:hidden ${
            theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          إغلاق
        </button>
      </div>

      <div className={`border-b p-2 ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActivePanel("contents")}
            className={`rounded-lg px-3 py-2 font-semibold ${
              activePanel === "contents"
                ? "bg-indigo-600 text-white"
                : theme === "dark"
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            المراجع والملاحظات
          </button>
          <button
            type="button"
            onClick={() => setActivePanel("compose")}
            className={`rounded-lg px-3 py-2 font-semibold ${
              activePanel === "compose"
                ? "bg-indigo-600 text-white"
                : theme === "dark"
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            إضافة ملاحظة
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activePanel === "compose" ? (
          <div className="space-y-3">
            <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              ملاحظة مرتبطة بالموضع الحالي: <span className="font-semibold text-indigo-600">{locator}</span>
            </p>
            <label htmlFor="reader-note" className={`block text-xs font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-700"}`}>
              الملاحظة
            </label>
            <textarea
              id="reader-note"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={7}
              placeholder="اكتب ملاحظتك هنا..."
              className={`w-full rounded-xl border px-3 py-2 text-sm leading-7 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                theme === "dark"
                  ? "border-slate-600 bg-slate-950 text-slate-100"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isAnnotationSaving || !noteDraft.trim()}
                onClick={() => void saveNewNote()}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
              >
                حفظ الملاحظة
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteDraft("");
                  setActivePanel("contents");
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  theme === "dark" ? "border-slate-600 text-slate-200" : "border-slate-300 text-slate-700"
                }`}
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>المراجع ({bookmarks.length})</h3>
                <button
                  type="button"
                  disabled={isAnnotationSaving}
                  onClick={() => void addBookmarkAtCurrentLocator()}
                  className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-60"
                >
                  حفظ الموضع الحالي
                </button>
              </div>
              {bookmarks.length ? (
                <div className="space-y-2">
                  {bookmarks.map((bookmark) => {
                    const label = extractBookmarkLabel(bookmark.payload);
                    return (
                      <div key={bookmark.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
                        <button type="button" onClick={() => jumpToLocator(bookmark.locator)} className="w-full text-right font-semibold text-amber-900 hover:underline">
                          {label || `مرجع عند ${bookmark.locator}`}
                        </button>
                        <p className="mt-1 text-[11px] text-amber-700">{bookmark.locator}</p>
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
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>لا توجد مراجع محفوظة.</p>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>الملاحظات ({notes.length})</h3>
                <button
                  type="button"
                  onClick={() => void loadAnnotations()}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                    theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  تحديث
                </button>
              </div>
              {notes.length ? (
                <div className="space-y-2">
                  {notes.map((note) => {
                    const noteText = extractNoteText(note.payload);
                    const isEditing = editingNoteId === note.id;

                    return (
                      <article
                        key={note.id}
                        className={`rounded-lg border p-2 text-xs ${
                          theme === "dark" ? "border-slate-700 bg-slate-950" : "border-indigo-200 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => jumpToLocator(note.locator)}
                          className="text-right font-semibold text-indigo-700 hover:underline"
                        >
                          {note.locator}
                        </button>

                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editingDraft}
                              onChange={(event) => setEditingDraft(event.target.value)}
                              rows={5}
                              className={`w-full rounded-lg border px-2 py-1.5 text-sm leading-6 focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200 ${
                                theme === "dark"
                                  ? "border-slate-600 bg-slate-900 text-slate-100"
                                  : "border-slate-300 bg-white text-slate-900"
                              }`}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isAnnotationSaving || !editingDraft.trim()}
                                onClick={() => void saveEditedNote()}
                                className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-400"
                              >
                                حفظ التعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingDraft("");
                                }}
                                className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                  theme === "dark" ? "border-slate-600 text-slate-200" : "border-slate-300 text-slate-700"
                                }`}
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className={`mt-1 whitespace-pre-wrap ${theme === "dark" ? "text-slate-100" : "text-slate-700"}`}>{noteText || "ملاحظة بدون نص."}</p>
                            <div className="mt-2 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingDraft(noteText);
                                }}
                                className="rounded-md border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteAnnotation(note.id)}
                                className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                  theme === "dark"
                                    ? "border-slate-600 text-slate-200 hover:bg-slate-800"
                                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                حذف
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>لا توجد ملاحظات محفوظة.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <section
      ref={readerRootRef}
      className={`rounded-2xl border p-2 shadow-sm lg:p-2.5 ${
        theme === "dark" ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-900"
      } ${isFocusMode ? "fixed inset-0 z-40 m-0 rounded-none" : ""}`}
    >
      <header
        className={`mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs ${
          theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
        }`}
      >
        <Link href={returnHref} className="font-semibold text-indigo-700 hover:text-indigo-600">
          العودة إلى مكتبتي
        </Link>
        <span className={theme === "dark" ? "text-slate-600" : "text-slate-400"}>•</span>
        <h1 className={`min-w-0 flex-1 truncate text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{bookTitle}</h1>

        <button
          type="button"
          onClick={() => controls?.previous()}
          disabled={!controls}
          className={`rounded-md border px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
            theme === "dark"
              ? "border-slate-600 text-slate-200 hover:bg-slate-800"
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          السابقة
        </button>
        <button
          type="button"
          onClick={() => controls?.next()}
          disabled={!controls}
          className="rounded-md bg-indigo-600 px-2 py-1 font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          التالية
        </button>

        <div className={`inline-flex items-center rounded-md border p-0.5 ${theme === "dark" ? "border-slate-600" : "border-slate-300"}`} role="radiogroup" aria-label="مظهر القارئ">
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            onClick={() => setTheme("light")}
            className={`rounded px-2 py-1 text-[11px] font-semibold ${theme === "light" ? "bg-slate-900 text-white" : theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
          >
            فاتح
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            onClick={() => setTheme("dark")}
            className={`rounded px-2 py-1 text-[11px] font-semibold ${theme === "dark" ? "bg-slate-100 text-slate-900" : theme === "light" ? "text-slate-600" : "text-slate-300"}`}
          >
            داكن
          </button>
        </div>

        <div className={`inline-flex items-center rounded-md border ${theme === "dark" ? "border-slate-600" : "border-slate-300"}`}>
          <button
            type="button"
            onClick={() => setZoomPercent((current) => clampZoom(current - ZOOM_STEP))}
            className={`px-2 py-1 font-semibold ${theme === "dark" ? "text-slate-100 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
            aria-label="تصغير"
          >
            −
          </button>
          <span className={`min-w-14 px-2 text-center text-[11px] font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>{zoomPercent}%</span>
          <button
            type="button"
            onClick={() => setZoomPercent((current) => clampZoom(current + ZOOM_STEP))}
            className={`px-2 py-1 font-semibold ${theme === "dark" ? "text-slate-100 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
            aria-label="تكبير"
          >
            +
          </button>
        </div>
        <p className={`rounded-md px-2 py-1 text-[11px] font-semibold ${theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{progressText}</p>
        <p className={`rounded-md px-2 py-1 text-[11px] ${theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{locator}</p>

        <button
          type="button"
          onClick={() => void toggleFocusMode()}
          className={`rounded-md border px-2 py-1 font-semibold ${
            theme === "dark" ? "border-slate-600 text-slate-200 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {isFocusMode ? "إنهاء وضع التركيز" : "وضع التركيز"}
        </button>

        <button
          type="button"
          onClick={() => {
            setActivePanel("contents");
            setIsPanelOpen(true);
          }}
          className={`rounded-md px-2 py-1 font-semibold lg:hidden ${
            theme === "dark" ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"
          }`}
        >
          المراجع والملاحظات
        </button>
      </header>

      <div className={`grid gap-2 ${isFocusMode ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-[52px_minmax(0,1fr)_320px]"}`}>
        {!isFocusMode ? (
          <nav
            className={`hidden h-[calc(100vh-7rem)] rounded-xl border p-2 lg:flex lg:flex-col lg:items-center lg:gap-2 ${
              theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActivePanel("contents");
                setIsPanelOpen(true);
              }}
              className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold ${
                theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
              }`}
            >
              المراجع
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel("compose");
                setIsPanelOpen(true);
              }}
              className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold ${
                theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
              }`}
            >
              ملاحظة
            </button>
            <button
              type="button"
              onClick={() => void addBookmarkAtCurrentLocator()}
              className="w-full rounded-lg bg-amber-100 px-2 py-2 text-[11px] font-semibold text-amber-900"
            >
              مرجع
            </button>
            {isPdf ? (
              <>
                <button
                  type="button"
                  onClick={() => setAnnotationMode("navigate")}
                  className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold ${annotationMode === "navigate" ? "bg-emerald-600 text-white" : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  قراءة
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationMode("draw")}
                  className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold ${annotationMode === "draw" ? "bg-indigo-600 text-white" : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  رسم
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationMode("eraser")}
                  className={`w-full rounded-lg px-2 py-2 text-[11px] font-semibold ${annotationMode === "eraser" ? "bg-rose-600 text-white" : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                >
                  محو
                </button>
                <button type="button" onClick={handleClearCurrentDrawing} className="w-full rounded-lg bg-rose-50 px-2 py-2 text-[11px] font-semibold text-rose-700">
                  مسح
                </button>
              </>
            ) : null}
          </nav>
        ) : null}

        <div className={`min-w-0 overflow-hidden rounded-xl border ${theme === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <ReaderViewport
            source={source}
            locator={locator}
            theme={theme}
            drawingMode={isPdf ? annotationMode : "navigate"}
            drawingStrokes={currentDrawing}
            zoomPercent={zoomPercent}
            focusMode={isFocusMode}
            onLocationChange={handleLocationChange}
            onControlsReady={setControls}
            onAddStroke={handleAddStroke}
            onEraseLastStroke={handleEraseLastStroke}
          />
        </div>

        <div className={`hidden h-[calc(100vh-7rem)] lg:block ${isFocusMode ? "max-h-[calc(100vh-5rem)]" : ""}`}>{panel}</div>
      </div>

      {isPdf ? (
        <div className="mt-2 flex flex-wrap gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setAnnotationMode("navigate")}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${annotationMode === "navigate" ? "bg-emerald-600 text-white" : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
          >
            قراءة
          </button>
          <button
            type="button"
            onClick={() => setAnnotationMode("draw")}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${annotationMode === "draw" ? "bg-indigo-600 text-white" : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
          >
            رسم
          </button>
          <button
            type="button"
            onClick={() => setAnnotationMode("eraser")}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${annotationMode === "eraser" ? "bg-rose-600 text-white" : theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
          >
            محو
          </button>
          <button type="button" onClick={handleClearCurrentDrawing} className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
            مسح طبقة الصفحة
          </button>
        </div>
      ) : null}

      {annotationMessage ? <p className="mt-2 text-xs text-indigo-600">{annotationMessage}</p> : null}
      {isSaving ? <p className={`mt-1 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>جارٍ حفظ التقدم...</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}

      {isPanelOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-3 lg:hidden" onClick={() => setIsPanelOpen(false)}>
          <div className="mr-auto h-full w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            {panel}
          </div>
        </div>
      ) : null}

      <div className="sr-only">{readerEngine ? `المحرّك: ${readerEngine.displayName}` : ""}</div>
    </section>
  );
}
