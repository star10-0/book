"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
};

type ReaderControls = {
  next: () => void;
  previous: () => void;
};

export function ReaderShell({ accessId, bookTitle, initialProgressPercent, initialLocator, source }: ReaderShellProps) {
  const [progressPercent, setProgressPercent] = useState(normalizeProgress(initialProgressPercent));
  const [locator, setLocator] = useState(initialLocator ?? "page:1");
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [controls, setControls] = useState<ReaderControls | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<string>(`${normalizeProgress(initialProgressPercent)}|${initialLocator ?? "page:1"}`);

  const readerEngine = useMemo(() => getReaderEngine(source), [source]);
  const progressText = useMemo(() => `${progressPercent.toFixed(1)}%`, [progressPercent]);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void persistProgress(progressPercent, locator);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [locator, persistProgress, progressPercent]);

  const handleLocationChange = useCallback(
    (payload: { locator: string; progressPercent: number }) => {
      setLocator(payload.locator);

      if (payload.progressPercent > 0) {
        setProgressPercent(normalizeProgress(payload.progressPercent));
      }
    },
    [],
  );

  return (
    <section className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
      <header className="space-y-1">
        <p className="text-xs font-medium text-indigo-600">قارئ الكتاب</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bookTitle}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {readerEngine ? `المحرّك: ${readerEngine.displayName}` : "لا يوجد ملف قراءة مدعوم لهذا الكتاب."}
        </p>
        {source?.isEncrypted ? (
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
        onNext={() => controls?.next()}
        onPrevious={() => controls?.previous()}
        onThemeChange={setTheme}
      />

      <ReaderViewport
        source={source}
        locator={locator}
        theme={theme}
        onLocationChange={handleLocationChange}
        onControlsReady={setControls}
      />
    </section>
  );
}
