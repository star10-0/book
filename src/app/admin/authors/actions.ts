"use server";

import { revalidatePath } from "next/cache";
import { requireAdminScope } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AuthorFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"nameAr" | "slug", string>>;
};

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function validateAuthorFields(nameAr: string, slug: string, currentId?: string) {
  const fieldErrors: AuthorFormState["fieldErrors"] = {};

  if (!nameAr || nameAr.length < 2) {
    fieldErrors.nameAr = "الاسم العربي مطلوب (حرفان على الأقل).";
  }

  if (!slug) {
    fieldErrors.slug = "slug مطلوب.";
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = "صيغة slug غير صحيحة.";
  } else {
    const existing = await prisma.author.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== currentId) {
      fieldErrors.slug = "هذا slug مستخدم مسبقًا.";
    }
  }

  return fieldErrors;
}

export async function createAuthorAction(_prevState: AuthorFormState, formData: FormData): Promise<AuthorFormState> {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/authors" });

  const nameAr = readField(formData, "nameAr");
  const slug = readField(formData, "slug").toLowerCase();

  const fieldErrors = await validateAuthorFields(nameAr, slug);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من بيانات المؤلف.", fieldErrors };
  }

  await prisma.author.create({ data: { nameAr, slug } });
  revalidatePath("/admin/authors");

  return { success: "تمت إضافة المؤلف." };
}

export async function updateAuthorAction(authorId: string, _prevState: AuthorFormState, formData: FormData): Promise<AuthorFormState> {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/authors" });

  const nameAr = readField(formData, "nameAr");
  const slug = readField(formData, "slug").toLowerCase();

  const fieldErrors = await validateAuthorFields(nameAr, slug, authorId);
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "تحقق من بيانات المؤلف.", fieldErrors };
  }

  await prisma.author.update({ where: { id: authorId }, data: { nameAr, slug } });
  revalidatePath("/admin/authors");

  return { success: "تم تحديث بيانات المؤلف." };
}

export async function deleteAuthorAction(formData: FormData) {
  await requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/authors" });

  const authorId = formData.get("authorId");

  if (typeof authorId !== "string" || !authorId) {
    return;
  }

  const booksCount = await prisma.book.count({ where: { authorId } });

  if (booksCount > 0) {
    return;
  }

  await prisma.author.delete({ where: { id: authorId } });
  revalidatePath("/admin/authors");
}
