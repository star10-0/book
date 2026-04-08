"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdminScope } from "@/lib/auth-session";
import { validateDeleteCategoryReassignment } from "@/lib/categories/guards";
import { CATEGORY_SLUG_PATTERN } from "@/lib/categories/types";
import { prisma } from "@/lib/prisma";

export type CategoryFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<
    Record<"nameAr" | "slug" | "parentId" | "sortOrder" | "kind" | "description" | "icon" | "coverImage" | "themeKey", string>
  >;
};

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseNullable(value: string) {
  return value.trim() ? value.trim() : null;
}

function parseSortOrder(raw: string): { value: number; error?: string } {
  if (!raw) return { value: 0 };

  if (!/^-?\d+$/.test(raw)) {
    return { value: 0, error: "ترتيب العرض يجب أن يكون رقمًا صحيحًا." };
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    return { value: 0, error: "ترتيب العرض غير صالح." };
  }

  return { value: parsed };
}

async function validateCategoryFields(input: {
  nameAr: string;
  slug: string;
  parentId: string | null;
  currentId?: string;
  sortOrder: number;
}) {
  const fieldErrors: CategoryFormState["fieldErrors"] = {};

  if (!input.nameAr || input.nameAr.length < 2) {
    fieldErrors.nameAr = "اسم التصنيف مطلوب (حرفان على الأقل).";
  }

  if (!input.slug) {
    fieldErrors.slug = "slug مطلوب.";
  } else if (!CATEGORY_SLUG_PATTERN.test(input.slug)) {
    fieldErrors.slug = "صيغة slug غير صحيحة.";
  }

  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId }, select: { id: true } });
    if (!parent) {
      fieldErrors.parentId = "التصنيف الأب المحدد غير موجود.";
    }
    if (input.currentId && input.currentId === input.parentId) {
      fieldErrors.parentId = "لا يمكن أن يكون التصنيف أبًا لنفسه.";
    }
  }

  if (!Number.isInteger(input.sortOrder)) {
    fieldErrors.sortOrder = "ترتيب العرض يجب أن يكون رقمًا صحيحًا.";
  }

  return fieldErrors;
}

async function assertNoCycle(currentId: string, nextParentId: string | null) {
  if (!nextParentId) return true;

  let parentId: string | null = nextParentId;

  while (parentId) {
    if (parentId === currentId) {
      return false;
    }

    const parentNode: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });
    parentId = parentNode?.parentId ?? null;
  }

  return true;
}

async function isDescendantCategory(ancestorId: string, possibleDescendantId: string) {
  let currentParentId: string | null = possibleDescendantId;

  while (currentParentId) {
    if (currentParentId === ancestorId) {
      return true;
    }

    const node: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    currentParentId = node?.parentId ?? null;
  }

  return false;
}

export async function createCategoryAction(_prevState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/categories" });

  const nameAr = readField(formData, "nameAr");
  const slug = readField(formData, "slug").toLowerCase();
  const parentId = parseNullable(readField(formData, "parentId"));
  const parsedSortOrder = parseSortOrder(readField(formData, "sortOrder"));
  const sortOrder = parsedSortOrder.value;
  const kind = parseNullable(readField(formData, "kind"));
  const description = parseNullable(readField(formData, "description"));
  const icon = parseNullable(readField(formData, "icon"));
  const coverImage = parseNullable(readField(formData, "coverImage"));
  const themeKey = parseNullable(readField(formData, "themeKey"));
  const isActive = formData.get("isActive") === "on";

  const fieldErrors = await validateCategoryFields({ nameAr, slug, parentId, sortOrder });
  if (parsedSortOrder.error) {
    fieldErrors.sortOrder = parsedSortOrder.error;
  }

  if (!fieldErrors.slug) {
    const siblingWithSlug = await prisma.category.findFirst({
      where: { parentId, slug },
      select: { id: true },
    });
    if (siblingWithSlug) {
      fieldErrors.slug = "يوجد تصنيف شقيق يستخدم هذا slug بالفعل.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من بيانات التصنيف.", fieldErrors };
  }

  try {
    await prisma.category.create({
      data: {
        nameAr,
        slug,
        parentId,
        sortOrder,
        kind,
        description,
        icon,
        coverImage,
        themeKey,
        isActive,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "slug مستخدم مسبقًا." };
    }
    throw error;
  }
  revalidatePath("/admin/categories");
  revalidatePath("/books");
  revalidatePath("/catalog");

  return { success: "تمت إضافة التصنيف." };
}

export async function updateCategoryAction(categoryId: string, _prevState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/categories" });

  const nameAr = readField(formData, "nameAr");
  const slug = readField(formData, "slug").toLowerCase();
  const parentId = parseNullable(readField(formData, "parentId"));
  const parsedSortOrder = parseSortOrder(readField(formData, "sortOrder"));
  const sortOrder = parsedSortOrder.value;
  const kind = parseNullable(readField(formData, "kind"));
  const description = parseNullable(readField(formData, "description"));
  const icon = parseNullable(readField(formData, "icon"));
  const coverImage = parseNullable(readField(formData, "coverImage"));
  const themeKey = parseNullable(readField(formData, "themeKey"));
  const isActive = formData.get("isActive") === "on";

  const fieldErrors = await validateCategoryFields({ nameAr, slug, parentId, currentId: categoryId, sortOrder });
  if (parsedSortOrder.error) {
    fieldErrors.sortOrder = parsedSortOrder.error;
  }

  if (!fieldErrors.slug) {
    const siblingWithSlug = await prisma.category.findFirst({
      where: { parentId, slug, id: { not: categoryId } },
      select: { id: true },
    });
    if (siblingWithSlug) {
      fieldErrors.slug = "يوجد تصنيف شقيق يستخدم هذا slug بالفعل.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من بيانات التصنيف.", fieldErrors };
  }

  const validTree = await assertNoCycle(categoryId, parentId);
  if (!validTree) {
    return { error: "لا يمكن نقل التصنيف تحت أحد أبنائه." };
  }

  try {
    await prisma.category.update({
      where: { id: categoryId },
      data: {
        nameAr,
        slug,
        parentId,
        sortOrder,
        kind,
        description,
        icon,
        coverImage,
        themeKey,
        isActive,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { error: "slug مستخدم مسبقًا." };
    }
    throw error;
  }
  revalidatePath("/admin/categories");
  revalidatePath("/books");
  revalidatePath("/catalog");

  return { success: "تم تحديث التصنيف." };
}

export async function deleteCategoryAction(categoryId: string, _prevState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/categories" });
  void _prevState;
  const confirmDelete = readField(formData, "confirmDelete");
  const reassignBooksToCategoryId = parseNullable(readField(formData, "reassignBooksToCategoryId"));
  const reassignChildrenToParentIdRaw = readField(formData, "reassignChildrenToParentId");
  const reassignChildrenToParentId = reassignChildrenToParentIdRaw === "__ROOT__" ? null : parseNullable(reassignChildrenToParentIdRaw);

  const [booksCount, childrenCount] = await Promise.all([
    prisma.book.count({ where: { categoryId } }),
    prisma.category.count({ where: { parentId: categoryId } }),
  ]);

  const guardError = validateDeleteCategoryReassignment({
    categoryId,
    confirmDelete,
    booksCount,
    childrenCount,
    reassignBooksToCategoryId,
    reassignChildrenToParentIdRaw,
    reassignChildrenToParentId,
  });
  if (guardError) {
    return { error: guardError };
  }

  if (reassignBooksToCategoryId) {
    const replacementCategory = await prisma.category.findUnique({
      where: { id: reassignBooksToCategoryId },
      select: { id: true },
    });
    if (!replacementCategory) {
      return { error: "تصنيف نقل الكتب غير صالح." };
    }
  }

  if (reassignChildrenToParentId) {
    const replacementParent = await prisma.category.findUnique({
      where: { id: reassignChildrenToParentId },
      select: { id: true },
    });
    if (!replacementParent) {
      return { error: "التصنيف الأب الجديد غير صالح." };
    }

    const invalidDescendantParent = await isDescendantCategory(categoryId, reassignChildrenToParentId);
    if (invalidDescendantParent) {
      return { error: "لا يمكن نقل الأبناء تحت أحد أحفاد التصنيف المحذوف." };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (booksCount > 0 && reassignBooksToCategoryId) {
      await tx.book.updateMany({
        where: { categoryId },
        data: { categoryId: reassignBooksToCategoryId },
      });
    }

    if (childrenCount > 0) {
      await tx.category.updateMany({
        where: { parentId: categoryId },
        data: { parentId: reassignChildrenToParentId ?? null },
      });
    }

    await tx.category.delete({ where: { id: categoryId } });
  });
  revalidatePath("/admin/categories");
  revalidatePath("/books");
  revalidatePath("/catalog");

  return { success: "تم حذف التصنيف." };
}
