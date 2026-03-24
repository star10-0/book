"use server";

import { BookStatus, OfferType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  BOOK_SLUG_PATTERN,
  buildBookOfferWrites,
  parseBookOffers,
  parseContentAccessPolicy,
  parseMetadata,
  parseStatus,
  readField,
  type SharedBookFormValues,
} from "@/lib/services/book-form";

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

async function validateBookForm(values: BookFormValues, bookId?: string) {
  const fieldErrors: BookFormState["fieldErrors"] = {};

  if (!values.titleAr || values.titleAr.length < 2) {
    fieldErrors.titleAr = "أدخل عنوانًا عربيًا صالحًا (حرفان على الأقل).";
  }

  if (!values.slug) {
    fieldErrors.slug = "حقل slug مطلوب.";
  } else if (!BOOK_SLUG_PATTERN.test(values.slug)) {
    fieldErrors.slug = "صيغة slug غير صحيحة. استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة - فقط.";
  } else {
    const existing = await prisma.book.findUnique({ where: { slug: values.slug }, select: { id: true } });

    if (existing && existing.id !== bookId) {
      fieldErrors.slug = "هذا slug مستخدم لكتاب آخر.";
    }
  }

  if (!values.authorId) {
    fieldErrors.authorId = "اختر المؤلف.";
  } else {
    const author = await prisma.author.findUnique({ where: { id: values.authorId }, select: { id: true } });
    if (!author) {
      fieldErrors.authorId = "المؤلف المختار غير موجود.";
    }
  }

  if (!values.categoryId) {
    fieldErrors.categoryId = "اختر التصنيف.";
  } else {
    const category = await prisma.category.findUnique({ where: { id: values.categoryId }, select: { id: true } });
    if (!category) {
      fieldErrors.categoryId = "التصنيف المختار غير موجود.";
    }
  }

  const status = parseStatus(values.publicationStatus ?? "");

  if (!status) {
    fieldErrors.publicationStatus = "حالة النشر غير صحيحة.";
  }

  const offerValues = parseBookOffers(values);
  const { buyEnabled, rentEnabled } = offerValues;

  if (!buyEnabled && !rentEnabled) {
    fieldErrors.buyOfferEnabled = "فعّل عرض شراء أو إيجار واحد على الأقل.";
    fieldErrors.rentOfferEnabled = "فعّل عرض شراء أو إيجار واحد على الأقل.";
  }

  if (buyEnabled && offerValues.purchasePriceCents === null) {
    fieldErrors.purchasePrice = "أدخل سعر شراء صالحًا أكبر من الصفر.";
  }

  if (rentEnabled && offerValues.rentalPriceCents === null) {
    fieldErrors.rentalPrice = "أدخل سعر إيجار صالحًا أكبر من الصفر.";
  }

  if (rentEnabled && offerValues.rentalDays === null) {
    fieldErrors.rentalDays = "مدة الإيجار يجب أن تكون رقمًا صحيحًا بين 1 و365 يومًا.";
  }

  if (values.description && values.description.length > 2000) {
    fieldErrors.description = "الوصف يجب ألا يتجاوز 2000 حرف.";
  }

  const metadata = parseMetadata(values);
  if (!metadata.ok && metadata.error === "invalid-json") {
    fieldErrors.metadata = "صيغة metadata غير صحيحة. أدخل JSON صالحًا.";
  } else if (!metadata.ok && metadata.error === "invalid-pages") {
    fieldErrors.metadataPages = "عدد الصفحات يجب أن يكون رقمًا صحيحًا أكبر من الصفر.";
  }

  if (Object.keys(fieldErrors).length > 0 || !status) {
    return {
      ok: false as const,
      fieldErrors,
    };
  }

  return {
    ok: true as const,
    status,
    buyEnabled,
    rentEnabled,
    purchasePriceCents: offerValues.purchasePriceCents,
    rentalPriceCents: offerValues.rentalPriceCents,
    rentalDays: offerValues.rentalDays,
    contentAccessPolicy: parseContentAccessPolicy(values),
    metadata: metadata.ok ? (metadata.data ?? Prisma.JsonNull) : undefined,
  };
}

export async function createBookAction(_prevState: BookFormState, formData: FormData): Promise<BookFormState> {
  await requireAdmin({ callbackUrl: "/admin/books/new" });

  const values = buildValues(formData);
  const validation = await validateBookForm(values);

  if (!validation.ok) {
    return {
      error: "تحقق من البيانات المدخلة ثم أعد المحاولة.",
      fieldErrors: validation.fieldErrors,
      values,
    };
  }

  const book = await prisma.book.create({
    data: {
      titleAr: values.titleAr!,
      slug: values.slug!,
      descriptionAr: values.description || null,
      metadata: validation.metadata,
      contentAccessPolicy: validation.contentAccessPolicy,
      status: validation.status,
      authorId: values.authorId!,
      categoryId: values.categoryId!,
      offers: {
        create: buildBookOfferWrites({
          buyEnabled: validation.buyEnabled,
          rentEnabled: validation.rentEnabled,
          purchasePriceCents: validation.purchasePriceCents,
          rentalPriceCents: validation.rentalPriceCents,
          rentalDays: validation.rentalDays,
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
  const validation = await validateBookForm(values, bookId);

  if (!validation.ok) {
    return {
      error: "تحقق من البيانات المدخلة ثم أعد المحاولة.",
      fieldErrors: validation.fieldErrors,
      values,
    };
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      titleAr: values.titleAr!,
      slug: values.slug!,
      descriptionAr: values.description || null,
      metadata: validation.metadata,
      contentAccessPolicy: validation.contentAccessPolicy,
      status: validation.status,
      authorId: values.authorId!,
      categoryId: values.categoryId!,
      offers: {
        deleteMany: {
          type: { in: [OfferType.PURCHASE, OfferType.RENTAL] },
        },
        create: buildBookOfferWrites({
          buyEnabled: validation.buyEnabled,
          rentEnabled: validation.rentEnabled,
          purchasePriceCents: validation.purchasePriceCents,
          rentalPriceCents: validation.rentalPriceCents,
          rentalDays: validation.rentalDays,
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
