"use client";

import { useActionState } from "react";
import { updateCreatorProfileAction, type StudioProfileState } from "@/app/studio/actions";

type StudioProfileFormProps = {
  initialDisplayName: string;
  initialSlug: string;
  initialBio: string;
};

const initialState: StudioProfileState = {};

export function StudioProfileForm({ initialDisplayName, initialSlug, initialBio }: StudioProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateCreatorProfileAction, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-4" dir="rtl">
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>اسم العرض</span>
        <input name="displayName" defaultValue={initialDisplayName} required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>Slug</span>
        <input name="slug" defaultValue={initialSlug} placeholder="my-creator-profile" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>نبذة</span>
        <textarea name="bio" rows={4} defaultValue={initialBio} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>

      {state.error ? <p className="text-sm font-semibold text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="text-sm font-semibold text-emerald-700">{state.success}</p> : null}

      <button type="submit" disabled={isPending} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">
        {isPending ? "جارٍ الحفظ..." : "حفظ الملف"}
      </button>
    </form>
  );
}
