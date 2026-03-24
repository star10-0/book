"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CategoryFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"nameAr" | "slug", string>>;
};

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function validateCategoryFields(nameAr: string, slug: string, currentId?: string) {
  const fieldErrors: CategoryFormState["fieldErrors"] = {};

  if (!nameAr || nameAr.length < 2) {
    fieldErrors.nameAr = "اسم التصنيف مطلوب (حرفان على الأقل).";
  }

  if (!slug) {
    fieldErrors.slug = "slug مطلوب.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = "صيغة slug غير صحيحة.";
  } else {
    const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== currentId) {
      fieldErrors.slug = "هذا slug مستخدم مسبقًا.";
    }
  }

  return fieldErrors;
}

export async function createCategoryAction(_prevState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin({ callbackUrl: "/admin/categories" });

  const nameAr = readField(formData, "nameAr");
  const slug = readField(formData, "slug").toLowerCase();

  const fieldErrors = await validateCategoryFields(nameAr, slug);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من بيانات التصنيف.", fieldErrors };
  }

  await prisma.category.create({ data: { nameAr, slug } });
  revalidatePath("/admin/categories");

  return { success: "تمت إضافة التصنيف." };
}

export async function updateCategoryAction(categoryId: string, _prevState: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin({ callbackUrl: "/admin/categories" });

  const nameAr = readField(formData, "nameAr");
  const slug = readField(formData, "slug").toLowerCase();

  const fieldErrors = await validateCategoryFields(nameAr, slug, categoryId);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من بيانات التصنيف.", fieldErrors };
  }

  await prisma.category.update({ where: { id: categoryId }, data: { nameAr, slug } });
  revalidatePath("/admin/categories");

  return { success: "تم تحديث التصنيف." };
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin({ callbackUrl: "/admin/categories" });

  const categoryId = formData.get("categoryId");

  if (typeof categoryId !== "string" || !categoryId) {
    return;
  }

  const booksCount = await prisma.book.count({ where: { categoryId } });

  if (booksCount > 0) {
    return;
  }

  await prisma.category.delete({ where: { id: categoryId } });
  revalidatePath("/admin/categories");
}
