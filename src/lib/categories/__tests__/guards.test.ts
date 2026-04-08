import assert from "node:assert/strict";
import test from "node:test";
import { validateDeleteCategoryReassignment } from "@/lib/categories/guards";

const baseInput = {
  categoryId: "cat_1",
  confirmDelete: "DELETE",
  booksCount: 0,
  childrenCount: 0,
  reassignBooksToCategoryId: null,
  reassignChildrenToParentIdRaw: "",
  reassignChildrenToParentId: null,
};

test("delete reassignment guard accepts valid empty category delete", () => {
  assert.equal(validateDeleteCategoryReassignment(baseInput), null);
});

test("delete reassignment guard enforces confirmation", () => {
  assert.equal(
    validateDeleteCategoryReassignment({ ...baseInput, confirmDelete: "WRONG" }),
    "للتأكيد، اكتب DELETE قبل الحذف.",
  );
});

test("delete reassignment guard enforces books reassignment when books exist", () => {
  assert.equal(
    validateDeleteCategoryReassignment({ ...baseInput, booksCount: 2 }),
    "اختر تصنيفًا بديلًا لنقل الكتب المرتبطة قبل الحذف.",
  );
});

test("delete reassignment guard enforces children reparent when children exist", () => {
  assert.equal(
    validateDeleteCategoryReassignment({ ...baseInput, childrenCount: 1 }),
    "اختر أبًا جديدًا للتصنيفات الفرعية أو انقلها للجذر قبل الحذف.",
  );
});

test("delete reassignment guard blocks self reassignment targets", () => {
  assert.equal(
    validateDeleteCategoryReassignment({ ...baseInput, booksCount: 1, reassignBooksToCategoryId: "cat_1" }),
    "لا يمكن إعادة تعيين الكتب إلى نفس التصنيف المحذوف.",
  );

  assert.equal(
    validateDeleteCategoryReassignment({
      ...baseInput,
      childrenCount: 1,
      reassignChildrenToParentIdRaw: "cat_1",
      reassignChildrenToParentId: "cat_1",
    }),
    "لا يمكن إعادة تعيين الأبناء إلى نفس التصنيف المحذوف.",
  );
});
