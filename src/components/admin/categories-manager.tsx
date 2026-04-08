"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction, type CategoryFormState } from "@/app/admin/categories/actions";
import type { CategoryTreeNode } from "@/lib/categories/types";

type CategoriesManagerProps = {
  categories: CategoryTreeNode[];
};

const initialState: CategoryFormState = {};

type FlatCategory = {
  id: string;
  nameAr: string;
  depth: number;
  isActive: boolean;
};

function flattenCategories(nodes: CategoryTreeNode[], depth = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { id: node.id, nameAr: node.nameAr, depth, isActive: node.isActive },
    ...flattenCategories(node.children, depth + 1),
  ]);
}

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

function ParentSelect({
  options,
  name,
  defaultValue,
  excludedId,
}: {
  options: FlatCategory[];
  name: string;
  defaultValue?: string | null;
  excludedId?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
      <option value="">بدون أب (قسم رئيسي)</option>
      {options
        .filter((item) => item.id !== excludedId)
        .map((item) => (
          <option key={item.id} value={item.id}>{`${"— ".repeat(item.depth)}${item.nameAr}${item.isActive ? "" : " (غير نشط)"}`}</option>
        ))}
    </select>
  );
}

function CreateCategoryForm({
  options,
  presetParentId,
  onClearPreset,
}: {
  options: FlatCategory[];
  presetParentId?: string | null;
  onClearPreset?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);

  useEffect(() => {
    if (state.success && onClearPreset) {
      onClearPreset();
    }
  }, [onClearPreset, state.success]);

  return (
    <form id="create-category-form" action={formAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
      <div>
        <label htmlFor="category-nameAr" className="mb-1 block text-sm font-medium text-slate-800">
          اسم التصنيف
        </label>
        <input id="category-nameAr" name="nameAr" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="مثال: الصف التاسع" />
        {state.fieldErrors?.nameAr ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.nameAr}</p> : null}
      </div>

      <div>
        <label htmlFor="category-slug" className="mb-1 block text-sm font-medium text-slate-800">
          slug
        </label>
        <input id="category-slug" name="slug" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="grade-9" />
        {state.fieldErrors?.slug ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">الأب</label>
        <ParentSelect options={options} name="parentId" defaultValue={presetParentId ?? ""} />
        {state.fieldErrors?.parentId ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.parentId}</p> : null}
        {presetParentId ? (
          <button type="button" onClick={onClearPreset} className="mt-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900">
            إلغاء اختيار الأب المسبق
          </button>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">النوع (اختياري)</label>
        <input name="kind" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="curriculum / university / year" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">ترتيب العرض</label>
        <input name="sortOrder" type="number" defaultValue={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
        <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
        نشط
      </div>

      <div className="md:col-span-3">
        <label className="mb-1 block text-sm font-medium text-slate-800">الوصف (اختياري)</label>
        <textarea name="description" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="وصف مختصر يظهر في واجهة التصفح" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">أيقونة (اختياري)</label>
        <input name="icon" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="book-open" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">صورة غلاف (اختياري)</label>
        <input name="coverImage" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="https://..." />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">themeKey (اختياري)</label>
        <input name="themeKey" type="text" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="indigo" />
      </div>

      <div className="md:col-span-3 flex items-end justify-end">
        <SaveButton pending={isPending} label="إضافة التصنيف" />
      </div>

      {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-3">{state.error}</p> : null}
      {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-3">{state.success}</p> : null}
    </form>
  );
}

function CategoryEditModal({
  category,
  options,
  onClose,
}: {
  category: CategoryTreeNode;
  options: FlatCategory[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateCategoryAction.bind(null, category.id), initialState);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3" role="dialog" aria-modal="true" aria-label={`تعديل ${category.nameAr}`}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">تعديل التصنيف</h3>
            <p className="text-xs text-slate-600">{`${category.nameAr} • المستوى ${category.depth + 1}`}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            إغلاق
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <section className="rounded-xl border border-slate-200 p-3">
            <h4 className="mb-3 text-sm font-bold text-slate-900">المعلومات الأساسية</h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">اسم التصنيف</label>
                <input name="nameAr" type="text" defaultValue={category.nameAr} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                {state.fieldErrors?.nameAr ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.nameAr}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">slug</label>
                <input name="slug" type="text" defaultValue={category.slug} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                {state.fieldErrors?.slug ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.slug}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">النوع</label>
                <input name="kind" type="text" defaultValue={category.kind ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">ترتيب العرض</label>
                <input name="sortOrder" type="number" defaultValue={category.sortOrder} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
                <input name="isActive" type="checkbox" defaultChecked={category.isActive} className="h-4 w-4 rounded border-slate-300" />
                نشط
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-3">
            <h4 className="mb-3 text-sm font-bold text-slate-900">معلومات الهيكل الهرمي</h4>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">الأب</label>
              <ParentSelect options={options} name="parentId" defaultValue={category.parentId} excludedId={category.id} />
              {state.fieldErrors?.parentId ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.parentId}</p> : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-3">
            <h4 className="mb-3 text-sm font-bold text-slate-900">معلومات العرض والبيانات الوصفية</h4>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-slate-700">الوصف</label>
                <textarea name="description" rows={2} defaultValue={category.description ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">أيقونة</label>
                <input name="icon" type="text" defaultValue={category.icon ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">صورة غلاف</label>
                <input name="coverImage" type="text" defaultValue={category.coverImage ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">themeKey</label>
                <input name="themeKey" type="text" defaultValue={category.themeKey ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              إلغاء
            </button>
            <SaveButton pending={isPending} label="حفظ التعديلات" />
          </div>

          {state.error ? <p className="text-xs font-semibold text-rose-700">{state.error}</p> : null}
          {state.success ? <p className="text-xs font-semibold text-emerald-700">{state.success}</p> : null}
        </form>
      </div>
    </div>
  );
}

function CategoryDeleteModal({
  category,
  options,
  onClose,
}: {
  category: CategoryTreeNode;
  options: FlatCategory[];
  onClose: () => void;
}) {
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteCategoryAction.bind(null, category.id), initialState);
  const needsReassignment = category.booksCount > 0 || category.childrenCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3" role="dialog" aria-modal="true" aria-label={`حذف ${category.nameAr}`}>
      <div className="w-full max-w-2xl rounded-2xl border border-rose-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-rose-800">حذف التصنيف</h3>
            <p className="text-xs text-slate-600">{`سيتم حذف التصنيف: ${category.nameAr}`}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            إغلاق
          </button>
        </div>

        <form action={deleteAction} className="space-y-3">
          <section className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <h4 className="mb-2 text-sm font-bold text-rose-900">قسم خطير</h4>
            <p className="text-xs text-rose-900">هذا الإجراء غير قابل للتراجع. لإكمال الحذف اكتب DELETE بشكل مطابق ثم اضغط زر الحذف.</p>
            <label htmlFor={`confirm-delete-${category.id}`} className="mt-2 block text-xs font-medium text-slate-700">
              تأكيد الحذف
            </label>
            <input
              id={`confirm-delete-${category.id}`}
              name="confirmDelete"
              placeholder="اكتب DELETE"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </section>

          {needsReassignment ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <h4 className="mb-2 text-sm font-bold text-amber-900">إعادة تعيين قبل الحذف</h4>
              <p className="mb-2 text-xs text-amber-900">يوجد كتب أو أبناء مرتبطون بهذا التصنيف. اختر وجهة نقلهم قبل الحذف.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor={`reassign-books-${category.id}`} className="mb-1 block text-xs font-medium text-slate-700">
                    نقل الكتب إلى
                  </label>
                  <select id={`reassign-books-${category.id}`} name="reassignBooksToCategoryId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">اختر تصنيفًا بديلًا (مطلوب عند وجود كتب)</option>
                    {options
                      .filter((item) => item.id !== category.id)
                      .map((item) => (
                        <option key={`${category.id}-books-${item.id}`} value={item.id}>{`${"— ".repeat(item.depth)}${item.nameAr}`}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`reassign-children-${category.id}`} className="mb-1 block text-xs font-medium text-slate-700">
                    نقل الأبناء إلى
                  </label>
                  <select id={`reassign-children-${category.id}`} name="reassignChildrenToParentId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">اختر الأب الجديد (مطلوب عند وجود أبناء)</option>
                    <option value="__ROOT__">الجذر (بدون أب)</option>
                    {options
                      .filter((item) => item.id !== category.id)
                      .map((item) => (
                        <option key={`${category.id}-children-${item.id}`} value={item.id}>{`${"— ".repeat(item.depth)}${item.nameAr}`}</option>
                      ))}
                  </select>
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "جارٍ الحذف..." : "حذف التصنيف"}
            </button>
          </div>

          {deleteState.error ? <p className="text-xs font-semibold text-rose-700">{deleteState.error}</p> : null}
          {deleteState.success ? <p className="text-xs font-semibold text-emerald-700">{deleteState.success}</p> : null}
        </form>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  expanded,
  onToggleExpand,
  onQuickAddChild,
  options,
}: {
  category: CategoryTreeNode;
  expanded: boolean;
  onToggleExpand: (categoryId: string) => void;
  onQuickAddChild: (categoryId: string) => void;
  options: FlatCategory[];
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <article className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {category.childrenCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(category.id)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {expanded ? "طيّ الأبناء" : "عرض الأبناء"}
                </button>
              ) : null}
              <h3 className="text-sm font-bold text-slate-900">{category.nameAr}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${category.isActive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {category.isActive ? "نشط" : "غير نشط"}
              </span>
            </div>
            <p className="text-xs text-slate-600">{`الأب: ${category.parentNameAr ?? "قسم رئيسي"} • المستوى: ${category.depth + 1}`}</p>
            <p className="text-xs text-slate-600">{`عدد الأبناء: ${category.childrenCount} • الكتب المرتبطة: ${category.booksCount}`}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <button type="button" onClick={() => setIsEditOpen(true)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50">
              تعديل
            </button>
            <button type="button" onClick={() => onQuickAddChild(category.id)} className="rounded-md border border-indigo-300 px-2.5 py-1.5 text-indigo-700 hover:bg-indigo-50">
              إضافة ابن
            </button>
            <Link href={`/admin/books?categoryId=${category.id}`} className="rounded-md border border-sky-300 px-2.5 py-1.5 text-sky-700 hover:bg-sky-50">
              عرض الكتب
            </Link>
            <Link href={`/admin/books/new?categoryId=${category.id}`} className="rounded-md border border-emerald-300 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-50">
              إضافة كتاب
            </Link>
            <button type="button" onClick={() => setIsDeleteOpen(true)} className="rounded-md border border-rose-300 px-2.5 py-1.5 text-rose-700 hover:bg-rose-50">
              حذف
            </button>
          </div>
        </div>
      </article>

      {isEditOpen ? <CategoryEditModal category={category} options={options} onClose={() => setIsEditOpen(false)} /> : null}
      {isDeleteOpen ? <CategoryDeleteModal category={category} options={options} onClose={() => setIsDeleteOpen(false)} /> : null}
    </>
  );
}

function CategoryTree({
  nodes,
  options,
  expandedIds,
  onToggleExpand,
  onQuickAddChild,
}: {
  nodes: CategoryTreeNode[];
  options: FlatCategory[];
  expandedIds: Set<string>;
  onToggleExpand: (categoryId: string) => void;
  onQuickAddChild: (categoryId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {nodes.map((category) => (
        <div key={category.id} className="space-y-3">
          <div className={category.depth > 0 ? "border-r-2 border-slate-200 pr-3 sm:pr-4" : ""}>
            <CategoryRow
              category={category}
              options={options}
              expanded={expandedIds.has(category.id)}
              onToggleExpand={onToggleExpand}
              onQuickAddChild={onQuickAddChild}
            />
          </div>
          {category.children.length > 0 && expandedIds.has(category.id) ? (
            <CategoryTree
              nodes={category.children}
              options={options}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onQuickAddChild={onQuickAddChild}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [presetParentId, setPresetParentId] = useState<string | null>(null);
  const flatOptions = useMemo(() => flattenCategories(categories), [categories]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(flatOptions.map((item) => item.id)));
  const normalizedQuery = query.trim().toLowerCase();

  const totals = useMemo(() => {
    const all = flatOptions.length;
    const active = flatOptions.filter((item) => item.isActive).length;
    const inactive = all - active;
    return { all, active, inactive };
  }, [flatOptions]);

  const expandAll = () => {
    setExpandedIds(new Set(flatOptions.map((item) => item.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set(categories.map((item) => item.id)));
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    const filterNodes = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
      nodes
        .map((node) => ({ ...node, children: filterNodes(node.children) }))
        .filter((node) => {
          const queryMatches = !normalizedQuery || node.nameAr.toLowerCase().includes(normalizedQuery) || node.slug.toLowerCase().includes(normalizedQuery);
          const statusMatches = statusFilter === "all" || (statusFilter === "active" ? node.isActive : !node.isActive);
          return (queryMatches && statusMatches) || node.children.length > 0;
        });

    return filterNodes(categories);
  }, [categories, normalizedQuery, statusFilter]);

  return (
    <div className="space-y-4">
      <CreateCategoryForm options={flatOptions} presetParentId={presetParentId} onClearPreset={() => setPresetParentId(null)} />

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <p className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{`إجمالي التصنيفات: ${totals.all}`}</p>
          <p className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{`النشطة: ${totals.active}`}</p>
          <p className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{`غير النشطة: ${totals.inactive}`}</p>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button type="button" onClick={expandAll} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            توسيع الكل
          </button>
          <button type="button" onClick={collapseAll} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            طيّ الكل
          </button>
        </div>
        <label htmlFor="category-search" className="mb-1 block text-xs font-medium text-slate-700">
          بحث داخل التصنيفات
        </label>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <input
            id="category-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="ابحث بالاسم أو slug"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">كل الحالات</option>
            <option value="active">النشطة فقط</option>
            <option value="inactive">غير النشطة فقط</option>
          </select>
        </div>
      </div>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
        <p className="font-semibold">ربط الكتب يتم من شاشة إدارة الكتب.</p>
        <p className="mt-1">استخدم «عرض الكتب» لمشاهدة الكتب المرتبطة بالتصنيف، أو «إضافة كتاب» لإنشاء كتاب جديد مع تعيين هذا التصنيف مسبقًا.</p>
      </section>

      <div className="space-y-3">
        {filteredCategories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">لا توجد نتائج مطابقة.</p>
        ) : (
          <CategoryTree
            nodes={filteredCategories}
            options={flatOptions}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onQuickAddChild={(categoryId) => {
              setPresetParentId(categoryId);
              if (typeof window !== "undefined") {
                requestAnimationFrame(() => {
                  document.getElementById("create-category-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
