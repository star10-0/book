export type DeleteCategoryGuardInput = {
  categoryId: string;
  confirmDelete: string;
  booksCount: number;
  childrenCount: number;
  reassignBooksToCategoryId: string | null;
  reassignChildrenToParentIdRaw: string;
  reassignChildrenToParentId: string | null;
};

export function validateDeleteCategoryReassignment(input: DeleteCategoryGuardInput) {
  if (!input.categoryId) {
    return "معرّف التصنيف غير صالح.";
  }

  if (input.confirmDelete !== "DELETE") {
    return "للتأكيد، اكتب DELETE قبل الحذف.";
  }

  if (input.booksCount > 0 && !input.reassignBooksToCategoryId) {
    return "اختر تصنيفًا بديلًا لنقل الكتب المرتبطة قبل الحذف.";
  }

  if (input.childrenCount > 0 && !input.reassignChildrenToParentIdRaw) {
    return "اختر أبًا جديدًا للتصنيفات الفرعية أو انقلها للجذر قبل الحذف.";
  }

  if (input.reassignBooksToCategoryId === input.categoryId) {
    return "لا يمكن إعادة تعيين الكتب إلى نفس التصنيف المحذوف.";
  }

  if (input.reassignChildrenToParentId === input.categoryId) {
    return "لا يمكن إعادة تعيين الأبناء إلى نفس التصنيف المحذوف.";
  }

  return null;
}
