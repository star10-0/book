"use client";

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

function CategoryDeleteButton({
  deleteAction,
  disabled,
  pending,
}: {
  deleteAction: (formData: FormData) => void | Promise<void>;
  disabled: boolean;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      formAction={deleteAction}
      disabled={disabled}
      className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "جارٍ الحذف..." : "حذف"}
    </button>
  );
}

function CategoryRowForm({
  category,
  options,
  expanded,
  onToggleExpand,
  onQuickAddChild,
}: {
  category: CategoryTreeNode;
  options: FlatCategory[];
  expanded: boolean;
  onToggleExpand: (categoryId: string) => void;
  onQuickAddChild: (categoryId: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(updateCategoryAction.bind(null, category.id), initialState);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteCategoryAction.bind(null, category.id), initialState);
  const deleteBlocked = category.booksCount > 0 || category.childrenCount > 0;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
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
          <button
            type="button"
            onClick={() => onQuickAddChild(category.id)}
            className="rounded-md border border-indigo-300 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            إضافة ابن
          </button>
        </div>
        <p>{`المستوى: ${category.depth + 1}${category.parentNameAr ? ` • الأب: ${category.parentNameAr}` : ""}`}</p>
        <p>{`أبناء: ${category.childrenCount} • كتب مرتبطة: ${category.booksCount} • الحالة: ${category.isActive ? "نشط" : "غير نشط"}${category.kind ? ` • النوع: ${category.kind}` : ""}`}</p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-3">
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
          <label className="mb-1 block text-xs font-medium text-slate-700">الأب</label>
          <ParentSelect options={options} name="parentId" defaultValue={category.parentId} excludedId={category.id} />
          {state.fieldErrors?.parentId ? <p className="mt-1 text-xs font-medium text-rose-700">{state.fieldErrors.parentId}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">النوع</label>
          <input name="kind" type="text" defaultValue={category.kind ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">ترتيب العرض</label>
          <input name="sortOrder" type="number" defaultValue={category.sortOrder} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
          <input name="isActive" type="checkbox" defaultChecked={category.isActive} className="h-4 w-4 rounded border-slate-300" />
          نشط
        </div>

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

        <div className="md:col-span-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SaveButton pending={isPending} label="حفظ" />
            <CategoryDeleteButton deleteAction={deleteAction} disabled={deleteBlocked || isDeleting} pending={isDeleting} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor={`confirm-delete-${category.id}`} className="mb-1 block text-xs font-medium text-slate-700">
                تأكيد الحذف
              </label>
              <input
                id={`confirm-delete-${category.id}`}
                name="confirmDelete"
                placeholder="اكتب DELETE ثم اضغط حذف"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>
          {deleteBlocked ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label htmlFor={`reassign-books-${category.id}`} className="mb-1 block text-xs font-medium text-slate-700">
                  نقل الكتب إلى
                </label>
                <select id={`reassign-books-${category.id}`} name="reassignBooksToCategoryId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">
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
                <select id={`reassign-children-${category.id}`} name="reassignChildrenToParentId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">
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
          ) : null}
        </div>

        {deleteBlocked ? <p className="text-xs font-medium text-amber-700 md:col-span-3">لا يمكن حذف هذا التصنيف قبل إزالة الأبناء والكتب المرتبطة.</p> : null}
        {deleteState.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-3">{deleteState.error}</p> : null}
        {deleteState.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-3">{deleteState.success}</p> : null}
        {state.error ? <p className="text-xs font-semibold text-rose-700 md:col-span-3">{state.error}</p> : null}
        {state.success ? <p className="text-xs font-semibold text-emerald-700 md:col-span-3">{state.success}</p> : null}
      </form>
    </div>
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
            <CategoryRowForm
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
