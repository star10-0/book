"use client";

import { useActionState } from "react";

type BookTextContentState = {
  error?: string;
  success?: string;
};

type BookTextContentFormProps = {
  initialTextContent: string;
  action: (state: BookTextContentState, formData: FormData) => Promise<BookTextContentState>;
};

const initialState: BookTextContentState = {};

export function BookTextContentForm({ initialTextContent, action }: BookTextContentFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">كتابة محتوى الكتاب داخل المنصة</h3>
        <p className="mt-1 text-sm text-slate-600">يمكنك كتابة النص الكامل للكتاب هنا ليظهر للقارئ داخل المتصفح حتى بدون PDF أو EPUB.</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">نص الكتاب</span>
        <textarea
          name="textContent"
          defaultValue={initialTextContent}
          rows={16}
          dir="rtl"
          placeholder="ابدأ بكتابة محتوى الكتاب هنا..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </label>

      {state.error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{state.success}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "جارٍ حفظ المحتوى..." : "حفظ المحتوى النصي"}
      </button>
    </form>
  );
}
