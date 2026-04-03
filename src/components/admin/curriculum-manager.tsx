"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import {
  attachBookToLevelAction,
  createCurriculumLevelAction,
  deleteCurriculumLevelAction,
  detachBookFromLevelAction,
  type CurriculumFormState,
  updateCurriculumLevelAction,
  updateLevelBookOrderAction,
} from "@/app/admin/curriculum/actions";

type BookOption = {
  id: string;
  titleAr: string;
  slug: string;
  status: string;
};

type LevelBook = {
  id: string;
  sortOrder: number;
  book: BookOption;
};

type CurriculumLevelRow = {
  id: string;
  nameAr: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  linkedBooks: LevelBook[];
};

type CurriculumManagerProps = {
  levels: CurriculumLevelRow[];
  books: BookOption[];
};

const initialState: CurriculumFormState = {};

function SubmitButton({ label, pending, className }: { label: string; pending: boolean; className?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${className ?? "bg-slate-900 text-white hover:bg-slate-700"}`}
    >
      {pending ? "جارٍ التنفيذ..." : label}
    </button>
  );
}

function CreateLevelForm() {
  const [state, formAction, isPending] = useActionState(createCurriculumLevelAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
      <div>
        <label htmlFor="level-nameAr" className="mb-1 block text-xs font-medium text-slate-700">
          اسم المستوى
        </label>
        <input id="level-nameAr" name="nameAr" type="text" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="مثال: الصف العاشر" />
      </div>
      <div>
        <label htmlFor="level-slug" className="mb-1 block text-xs font-medium text-slate-700">
          slug
        </label>
        <input id="level-slug" name="slug" type="text" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="grade-10" />
      </div>
      <div>
        <label htmlFor="level-order" className="mb-1 block text-xs font-medium text-slate-700">
          ترتيب العرض
        </label>
        <input id="level-order" name="sortOrder" type="number" defaultValue={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex items-end gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
          فعّال
        </label>
        <SubmitButton label="إضافة مستوى" pending={isPending} />
      </div>
      {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-4">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-4">{state.success}</p> : null}
    </form>
  );
}

function LevelBooksSection({ level, books }: { level: CurriculumLevelRow; books: BookOption[] }) {
  const [query, setQuery] = useState("");
  const [attachState, attachAction, isAttachPending] = useActionState(attachBookToLevelAction.bind(null, level.id), initialState);
  const [detachState, detachAction] = useActionState(detachBookFromLevelAction, initialState);
  const [orderState, orderAction] = useActionState(updateLevelBookOrderAction, initialState);

  const linkedBookIds = useMemo(() => new Set(level.linkedBooks.map((item) => item.book.id)), [level.linkedBooks]);

  const availableBooks = useMemo(
    () =>
      books.filter((book) => {
        if (linkedBookIds.has(book.id)) {
          return false;
        }

        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
          return true;
        }

        return book.titleAr.toLowerCase().includes(normalizedQuery) || book.slug.toLowerCase().includes(normalizedQuery);
      }),
    [books, linkedBookIds, query],
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-800">الكتب المرتبطة بالمستوى</h4>

      <form action={attachAction} className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
        <div>
          <label htmlFor={`book-search-${level.id}`} className="mb-1 block text-xs font-medium text-slate-700">
            بحث عن كتاب
          </label>
          <input
            id={`book-search-${level.id}`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="اكتب اسم الكتاب أو slug"
          />
        </div>

        <div>
          <label htmlFor={`book-id-${level.id}`} className="mb-1 block text-xs font-medium text-slate-700">
            اختيار كتاب
          </label>
          <select id={`book-id-${level.id}`} name="bookId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">اختر كتابًا...</option>
            {availableBooks.map((book) => (
              <option key={book.id} value={book.id}>{`${book.titleAr} (${book.slug})`}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`book-sort-order-${level.id}`} className="mb-1 block text-xs font-medium text-slate-700">
            ترتيب
          </label>
          <input id={`book-sort-order-${level.id}`} name="sortOrder" type="number" defaultValue={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="flex items-end">
          <SubmitButton label="ربط الكتاب" pending={isAttachPending} />
        </div>

        {attachState.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-4">{attachState.error}</p> : null}
        {attachState.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-4">{attachState.success}</p> : null}
      </form>

      {level.linkedBooks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-600">لا توجد كتب مرتبطة بهذا المستوى حتى الآن.</p>
      ) : (
        <div className="space-y-2">
          {level.linkedBooks.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_120px_auto_auto] md:items-end">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.book.titleAr}</p>
                <p className="text-xs text-slate-500">{item.book.slug}</p>
              </div>

              <form action={orderAction} className="space-y-1">
                <input type="hidden" name="curriculumLevelBookId" value={item.id} />
                <label htmlFor={`order-${item.id}`} className="block text-xs font-medium text-slate-700">
                  ترتيب العرض
                </label>
                <input
                  id={`order-${item.id}`}
                  name="sortOrder"
                  type="number"
                  defaultValue={item.sortOrder}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button type="submit" className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-300">
                  حفظ الترتيب
                </button>
              </form>

              <form action={detachAction}>
                <input type="hidden" name="curriculumLevelId" value={level.id} />
                <input type="hidden" name="bookId" value={item.book.id} />
                <button type="submit" className="rounded-md border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                  إزالة الربط
                </button>
              </form>
            </div>
          ))}
          {detachState.error ? <p className="text-xs font-semibold text-rose-700">{detachState.error}</p> : null}
          {detachState.success ? <p className="text-xs font-semibold text-emerald-700">{detachState.success}</p> : null}
          {orderState.error ? <p className="text-xs font-semibold text-rose-700">{orderState.error}</p> : null}
          {orderState.success ? <p className="text-xs font-semibold text-emerald-700">{orderState.success}</p> : null}
        </div>
      )}
    </div>
  );
}

function LevelCard({ level, books }: { level: CurriculumLevelRow; books: BookOption[] }) {
  const [state, formAction, isPending] = useActionState(updateCurriculumLevelAction.bind(null, level.id), initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCurriculumLevelAction, initialState);

  return (
    <article className="space-y-3 rounded-xl border border-slate-200 p-4">
      <form action={formAction} className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto_auto] md:items-end">
        <div>
          <label htmlFor={`name-${level.id}`} className="mb-1 block text-xs font-medium text-slate-700">
            اسم المستوى
          </label>
          <input id={`name-${level.id}`} name="nameAr" defaultValue={level.nameAr} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor={`slug-${level.id}`} className="mb-1 block text-xs font-medium text-slate-700">
            slug
          </label>
          <input id={`slug-${level.id}`} name="slug" defaultValue={level.slug} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor={`sort-${level.id}`} className="mb-1 block text-xs font-medium text-slate-700">
            ترتيب
          </label>
          <input id={`sort-${level.id}`} name="sortOrder" type="number" defaultValue={level.sortOrder} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input name="isActive" type="checkbox" defaultChecked={level.isActive} className="h-4 w-4 rounded border-slate-300" />
          فعّال
        </label>

        <SubmitButton label="حفظ" pending={isPending} />
      </form>

      <form action={deleteAction} className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <input type="hidden" name="levelId" value={level.id} />
        {level.linkedBooks.length > 0 ? (
          <label className="flex items-center gap-2 text-xs font-medium text-rose-800">
            <input type="checkbox" name="confirmCascade" value="yes" className="h-4 w-4 rounded border-rose-300" />
            أفهم أن الحذف سيزيل {level.linkedBooks.length} ربط/روابط كتب من هذا المستوى.
          </label>
        ) : (
          <p className="text-xs text-rose-800">لا توجد كتب مرتبطة، يمكن الحذف مباشرة.</p>
        )}

        <SubmitButton label="حذف المستوى" pending={deletePending} className="border border-rose-300 text-rose-700 hover:bg-rose-100" />
      </form>

      {state.error ? <p className="text-xs font-semibold text-rose-700">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700">{state.success}</p> : null}
      {deleteState.error ? <p className="text-xs font-semibold text-rose-700">{deleteState.error}</p> : null}
      {deleteState.success ? <p className="text-xs font-semibold text-emerald-700">{deleteState.success}</p> : null}

      <LevelBooksSection level={level} books={books} />
    </article>
  );
}

export function CurriculumManager({ levels, books }: CurriculumManagerProps) {
  return (
    <div className="space-y-4">
      <CreateLevelForm />

      {levels.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">لا توجد مستويات منهاج بعد. أضف مستوى جديدًا من النموذج بالأعلى.</p>
      ) : null}

      <div className="space-y-4">
        {levels.map((level) => (
          <LevelCard key={level.id} level={level} books={books} />
        ))}
      </div>
    </div>
  );
}
