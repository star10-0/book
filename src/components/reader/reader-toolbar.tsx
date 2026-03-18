import { ReaderTheme } from "@/lib/reader/types";

type ReaderToolbarProps = {
  progressText: string;
  locator: string;
  theme: ReaderTheme;
  isSaving: boolean;
  saveError: string | null;
  canNavigate: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onThemeChange: (theme: ReaderTheme) => void;
};

export function ReaderToolbar({
  progressText,
  locator,
  theme,
  isSaving,
  saveError,
  canNavigate,
  onNext,
  onPrevious,
  onThemeChange,
}: ReaderToolbarProps) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">التقدم: {progressText}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">الموضع الحالي: {locator}</p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-300 p-1 dark:border-slate-600" role="radiogroup" aria-label="وضع القراءة">
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            onClick={() => onThemeChange("light")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              theme === "light"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            فاتح
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            onClick={() => onThemeChange("dark")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              theme === "dark"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            داكن
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canNavigate}
          onClick={onPrevious}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          الصفحة السابقة
        </button>
        <button
          type="button"
          disabled={!canNavigate}
          onClick={onNext}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          الصفحة التالية
        </button>
      </div>

      {isSaving ? <p className="text-xs text-slate-500 dark:text-slate-400">جارٍ حفظ التقدم...</p> : null}
      {saveError ? <p className="text-xs text-rose-600">{saveError}</p> : null}
    </section>
  );
}
