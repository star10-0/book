"use client";

import { useActionState } from "react";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction, type CategoryFormState } from "@/app/admin/categories/actions";

type CategoryRow = {
  id: string;
  nameAr: string;
  slug: string;
  booksCount: number;
};

type CategoriesManagerProps = {
  categories: CategoryRow[];
};

const initialState: CategoryFormState = {};

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

function CreateCategoryForm() {
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
      <div>
        <label htmlFor="category-nameAr" className="mb-1 block text-sm font-medium text-slate-800">
          اسم التصنيف
        </label>
        <input id="category-nameAr" name="nameAr" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="مثال: تطوير ذات" />
        {state.fieldErrors?.nameAr ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.nameAr}</p> : null}
      </div>

      <div>
        <label htmlFor="category-slug" className="mb-1 block text-sm font-medium text-slate-800">
          slug
        </label>
        <input id="category-slug" name="slug" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="self-development" />
        {state.fieldErrors?.slug ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
      </div>

      <div className="flex items-end">
        <SaveButton pending={isPending} label="إضافة التصنيف" />
      </div>

      {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-3">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-3">{state.success}</p> : null}
    </form>
  );
}

function CategoryRowForm({ category }: { category: CategoryRow }) {
  const [state, formAction, isPending] = useActionState(updateCategoryAction.bind(null, category.id), initialState);
  const deleteAction = deleteCategoryAction.bind(null, category.id);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
      <div>
        <label htmlFor={`category-name-${category.id}`} className="mb-1 block text-xs font-medium text-slate-700">
          اسم التصنيف
        </label>
        <input id={`category-name-${category.id}`} name="nameAr" type="text" defaultValue={category.nameAr} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {state.fieldErrors?.nameAr ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.nameAr}</p> : null}
      </div>

      <div>
        <label htmlFor={`category-slug-${category.id}`} className="mb-1 block text-xs font-medium text-slate-700">
          slug
        </label>
        <input id={`category-slug-${category.id}`} name="slug" type="text" defaultValue={category.slug} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {state.fieldErrors?.slug ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
      </div>

      <div className="flex items-end">
        <SaveButton pending={isPending} label="حفظ" />
      </div>

      <div className="flex items-end justify-end">
        <CategoryDeleteButton deleteAction={deleteAction} booksCount={category.booksCount} />
      </div>

      <p className="text-xs text-slate-500 md:col-span-4">{`عدد الكتب المرتبطة: ${category.booksCount}`}</p>
      {category.booksCount > 0 ? <p className="text-xs font-medium text-amber-700 md:col-span-4">لا يمكن حذف التصنيف طالما توجد كتب مرتبطة به.</p> : null}
      {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-4">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-4">{state.success}</p> : null}
    </form>
  );
}

function CategoryDeleteButton({ deleteAction, booksCount }: { deleteAction: (formData: FormData) => void | Promise<void>; booksCount: number }) {
  return (
    <button
      type="submit"
      formAction={deleteAction}
      disabled={booksCount > 0}
      className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      حذف
    </button>
  );
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  return (
    <div className="space-y-4">
      <CreateCategoryForm />

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            لا توجد تصنيفات بعد. أضف اسم تصنيف من النموذج بالأعلى ثم اضغط «إضافة التصنيف».
          </p>
        ) : null}

        {categories.map((category) => (
          <CategoryRowForm key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
