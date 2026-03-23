"use client";

import { useActionState } from "react";
import { createAuthorAction, deleteAuthorAction, updateAuthorAction, type AuthorFormState } from "@/app/admin/authors/actions";

type AuthorRow = {
  id: string;
  nameAr: string;
  slug: string;
  booksCount: number;
};

type AuthorsManagerProps = {
  authors: AuthorRow[];
};

const initialState: AuthorFormState = {};

function SaveButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "جارٍ الحفظ..." : label}
    </button>
  );
}

function CreateAuthorForm() {
  const [state, formAction, isPending] = useActionState(createAuthorAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
      <div>
        <label htmlFor="author-nameAr" className="mb-1 block text-sm font-medium text-slate-800">
          اسم المؤلف
        </label>
        <input id="author-nameAr" name="nameAr" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="مثال: مها العلي" />
        {state.fieldErrors?.nameAr ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.nameAr}</p> : null}
      </div>

      <div>
        <label htmlFor="author-slug" className="mb-1 block text-sm font-medium text-slate-800">
          slug
        </label>
        <input id="author-slug" name="slug" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="maha-ali" />
        {state.fieldErrors?.slug ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
      </div>

      <div className="flex items-end">
        <SaveButton pending={isPending} label="إضافة المؤلف" />
      </div>

      {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-3">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-3">{state.success}</p> : null}
    </form>
  );
}

function AuthorRowForm({ author }: { author: AuthorRow }) {
  const [state, formAction, isPending] = useActionState(updateAuthorAction.bind(null, author.id), initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
      <div>
        <label htmlFor={`author-name-${author.id}`} className="mb-1 block text-xs font-medium text-slate-700">
          الاسم العربي
        </label>
        <input id={`author-name-${author.id}`} name="nameAr" type="text" defaultValue={author.nameAr} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {state.fieldErrors?.nameAr ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.nameAr}</p> : null}
      </div>

      <div>
        <label htmlFor={`author-slug-${author.id}`} className="mb-1 block text-xs font-medium text-slate-700">
          slug
        </label>
        <input id={`author-slug-${author.id}`} name="slug" type="text" defaultValue={author.slug} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {state.fieldErrors?.slug ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
      </div>

      <div className="flex items-end">
        <SaveButton pending={isPending} label="حفظ" />
      </div>

      <div className="flex items-end justify-end">
        <AuthorDeleteButton authorId={author.id} booksCount={author.booksCount} />
      </div>

      <p className="text-xs text-slate-500 md:col-span-4">{`عدد الكتب المرتبطة: ${author.booksCount}`}</p>
      {author.booksCount > 0 ? <p className="text-xs font-medium text-amber-700 md:col-span-4">لا يمكن حذف المؤلف طالما توجد كتب مرتبطة به.</p> : null}
      {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-4">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-4">{state.success}</p> : null}
    </form>
  );
}

function AuthorDeleteButton({ authorId, booksCount }: { authorId: string; booksCount: number }) {
  return (
    <form action={deleteAuthorAction}>
      <input type="hidden" name="authorId" value={authorId} />
      <button
        type="submit"
        disabled={booksCount > 0}
        className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        حذف
      </button>
    </form>
  );
}

export function AuthorsManager({ authors }: AuthorsManagerProps) {
  return (
    <div className="space-y-4">
      <CreateAuthorForm />

      <div className="space-y-3">
        {authors.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            لا يوجد مؤلفون بعد. املأ نموذج «اسم المؤلف» بالأعلى ثم اضغط «إضافة المؤلف».
          </p>
        ) : null}

        {authors.map((author) => (
          <AuthorRowForm key={author.id} author={author} />
        ))}
      </div>
    </div>
  );
}
