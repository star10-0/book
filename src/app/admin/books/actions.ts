"use server";

import { BookStatus, OfferType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  buildBookOfferWrites,
  readField,
  type SharedBookFormValues,
} from "@/lib/services/book-form";
import { validateAdminBookForm } from "@/lib/services/book-form-validation";

export type BookFormValues = SharedBookFormValues;

export type BookFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<keyof BookFormValues, string>>;
  values?: BookFormValues;
};

function buildValues(formData: FormData): BookFormValues {
  return {
    titleAr: readField(formData, "titleAr"),
    slug: readField(formData, "slug").toLowerCase(),
    authorId: readField(formData, "authorId"),
    categoryId: readField(formData, "categoryId"),
    purchasePrice: readField(formData, "purchasePrice"),
    rentalPrice: readField(formData, "rentalPrice"),
    rentalDays: readField(formData, "rentalDays"),
    publicationStatus: readField(formData, "publicationStatus") || "draft",
    buyOfferEnabled: readField(formData, "buyOfferEnabled") || "disabled",
    rentOfferEnabled: readField(formData, "rentOfferEnabled") || "disabled",
    allowReadingOnSite: readField(formData, "allowReadingOnSite"),
    allowDownloading: readField(formData, "allowDownloading"),
    previewOnly: readField(formData, "previewOnly"),
    description: readField(formData, "description"),
    metadata: readField(formData, "metadata"),
    metadataLanguage: readField(formData, "metadataLanguage"),
    metadataPages: readField(formData, "metadataPages"),
    metadataPublisher: readField(formData, "metadataPublisher"),
  };
}

export async function createBookAction(_prevState: BookFormState, formData: FormData): Promise<BookFormState> {
  await requireAdmin({ callbackUrl: "/admin/books/new" });

  const values = buildValues(formData);
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
      titleAr: values.titleAr!,
      slug: values.slug!,
      descriptionAr: values.description || null,
      metadata: validation.data.metadata,
      contentAccessPolicy: validation.data.contentAccessPolicy,
      status: validation.data.status,
      authorId: values.authorId!,
      categoryId: values.categoryId!,
      offers: {
        create: buildBookOfferWrites({
          buyEnabled: validation.data.buyEnabled,
          rentEnabled: validation.data.rentEnabled,
          purchasePriceCents: validation.data.purchasePriceCents,
          rentalPriceCents: validation.data.rentalPriceCents,
          rentalDays: validation.data.rentalDays,
        }),
      },
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

  const textContentValue = formData.get("textContent");
  const textContent = typeof textContentValue === "string" ? textContentValue.trim() : "";

  if (textContent.length > 500_000) {
    return { error: "المحتوى النصي طويل جدًا. الحد الأقصى 500,000 حرف." };
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      textContent: textContent || null,
    },
  });

  revalidatePath(`/admin/books/${bookId}/edit`);
  revalidatePath("/admin/books");
  revalidatePath("/books");

  return {
    success: textContent ? "تم حفظ المحتوى النصي بنجاح." : "تم مسح المحتوى النصي من الكتاب.",
  };
}

export async function updateBookAction(bookId: string, _prevState: BookFormState, formData: FormData): Promise<BookFormState> {
  await requireAdmin({ callbackUrl: `/admin/books/${bookId}/edit` });

  const values = buildValues(formData);
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
      offers: {
        deleteMany: {
          type: { in: [OfferType.PURCHASE, OfferType.RENTAL] },
        },
        create: buildBookOfferWrites({
          buyEnabled: validation.data.buyEnabled,
          rentEnabled: validation.data.rentEnabled,
          purchasePriceCents: validation.data.purchasePriceCents,
          rentalPriceCents: validation.data.rentalPriceCents,
          rentalDays: validation.data.rentalDays,
        }),
      },
    },
  });

  revalidatePath("/admin/books");
  revalidatePath(`/admin/books/${bookId}/edit`);
  revalidatePath("/books");

  return {
    success: "تم حفظ بيانات الكتاب والعروض بنجاح.",
    values,
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
