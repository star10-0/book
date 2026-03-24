"use client";

import { useActionState } from "react";
import { becomeCreatorAction, type StudioProfileState } from "@/app/studio/actions";

const initialState: StudioProfileState = {};

type BecomeCreatorFormProps = {
  suggestedName: string;
};

export function BecomeCreatorForm({ suggestedName }: BecomeCreatorFormProps) {
  const [state, formAction, isPending] = useActionState(becomeCreatorAction, initialState);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4" dir="rtl">
      <h3 className="text-base font-bold text-indigo-900">ابدأ ككاتب</h3>
      <label className="block text-sm text-indigo-900">
        اسم الكاتب
        <input
          name="displayName"
          defaultValue={suggestedName}
          className="mt-1 w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-slate-900"
          required
        />
      </label>
      <label className="block text-sm text-indigo-900">
        نبذة قصيرة (اختياري)
        <textarea name="bio" rows={3} className="mt-1 w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-slate-900" />
      </label>

      {state.error ? <p className="text-sm font-semibold text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-semibold text-emerald-700">{state.success}</p> : null}

      <button type="submit" disabled={isPending} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">
        {isPending ? "جارٍ التفعيل..." : "تفعيل حساب الكاتب"}
      </button>
    </form>
  );
}
