"use server";

import { BookStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  buildAccessSettingsFromPolicy,
  type SharedBookFormValues,
} from "@/lib/services/book-form";
import { validateAdminBookForm } from "@/lib/services/book-form-validation";
import { buildBookOffersReplaceData, buildBookValues, buildBookWriteData, parseTextContentForm } from "@/lib/services/book-workflows";

export type BookFormValues = SharedBookFormValues;

export type BookFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<keyof BookFormValues, string>>;
  values?: BookFormValues;
};

export async function createBookAction(_prevState: BookFormState, formData: FormData): Promise<BookFormState> {
  await requireAdmin({ callbackUrl: "/admin/books/new" });

  const values = buildBookValues(formData, {
    publicationStatus: "draft",
    buyOfferEnabled: "disabled",
    rentOfferEnabled: "disabled",
  });
  const validation = await validateAdminBookForm(values);

  if (!validation.ok) {
    return {
      error: "تحقق من البيانات المدخلة ثم أعد المحاولة.",
      fieldErrors: validation.error,
      values,
    };
  }

  const book = await prisma.book.create({
    data: {
      ...buildBookWriteData({
        values,
        validation: validation.data,
        authorId: values.authorId!,
      }),
    },
    select: { id: true },
  });

  revalidatePath("/admin/books");
  revalidatePath("/books");
  redirect(`/admin/books/${book.id}/edit?focus=content`);
}

type AdminBookTextContentState = {
  error?: string;
  success?: string;
};

export async function updateAdminBookTextContentAction(
  bookId: string,
  _prevState: AdminBookTextContentState,
  formData: FormData,
): Promise<AdminBookTextContentState> {
  await requireAdmin({ callbackUrl: `/admin/books/${bookId}/edit` });

  const parsed = parseTextContentForm(formData);
  if (parsed.error) {
    return { error: parsed.error };
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      textContent: parsed.textContent || null,
    },
  });

  revalidatePath(`/admin/books/${bookId}/edit`);
  revalidatePath("/admin/books");
  revalidatePath("/books");

  return {
    success: parsed.textContent ? "تم حفظ المحتوى النصي بنجاح." : "تم مسح المحتوى النصي من الكتاب.",
  };
}

export async function updateBookAction(bookId: string, _prevState: BookFormState, formData: FormData): Promise<BookFormState> {
  await requireAdmin({ callbackUrl: `/admin/books/${bookId}/edit` });

  const values = buildBookValues(formData, {
    publicationStatus: "draft",
    buyOfferEnabled: "disabled",
    rentOfferEnabled: "disabled",
  });
  const validation = await validateAdminBookForm(values, bookId);

  if (!validation.ok) {
    return {
      error: "تحقق من البيانات المدخلة ثم أعد المحاولة.",
      fieldErrors: validation.error,
      values,
    };
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      titleAr: values.titleAr!,
      slug: values.slug!,
      descriptionAr: values.description || null,
      metadata: validation.data.metadata,
      contentAccessPolicy: validation.data.contentAccessPolicy,
      status: validation.data.status,
      authorId: values.authorId!,
      categoryId: values.categoryId!,
      offers: buildBookOffersReplaceData(validation.data),
    },
  });

  revalidatePath("/admin/books");
  revalidatePath(`/admin/books/${bookId}/edit`);
  revalidatePath("/books");

  return {
    success: "تم حفظ بيانات الكتاب والعروض بنجاح.",
    values: {
      ...values,
      ...buildAccessSettingsFromPolicy(validation.data.contentAccessPolicy),
    },
  };
}

export async function deleteBookAction(formData: FormData) {
  await requireAdmin({ callbackUrl: "/admin/books" });

  const bookId = formData.get("bookId");

  if (typeof bookId !== "string" || !bookId) {
    return;
  }

  await prisma.book.delete({ where: { id: bookId } });
  revalidatePath("/admin/books");
  revalidatePath("/books");
}

export async function publishBookAction(formData: FormData) {
  await requireAdmin({ callbackUrl: "/admin/books" });

  const bookId = formData.get("bookId");

  if (typeof bookId !== "string" || !bookId) {
    return;
  }

  await prisma.book.update({ where: { id: bookId }, data: { status: BookStatus.PUBLISHED } });
  revalidatePath("/admin/books");
  revalidatePath("/books");
}

export async function unpublishBookAction(formData: FormData) {
  await requireAdmin({ callbackUrl: "/admin/books" });

  const bookId = formData.get("bookId");

  if (typeof bookId !== "string" || !bookId) {
    return;
  }

  await prisma.book.update({ where: { id: bookId }, data: { status: BookStatus.DRAFT } });
  revalidatePath("/admin/books");
  revalidatePath("/books");
}
