"use server";

import { BookStatus, CurrencyCode, OfferType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

const BOOK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BookFormValues = {
  titleAr?: string;
  slug?: string;
  authorId?: string;
  categoryId?: string;
  purchasePrice?: string;
  rentalPrice?: string;
  rentalDays?: string;
  publicationStatus?: string;
  buyOfferEnabled?: string;
  rentOfferEnabled?: string;
  description?: string;
  metadata?: string;
};

export type BookFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<keyof BookFormValues, string>>;
  values?: BookFormValues;
};

function readField(formData: FormData, key: keyof BookFormValues) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseStatus(value: string) {
  if (value === "draft") return BookStatus.DRAFT;
  if (value === "pending_review") return BookStatus.PENDING_REVIEW;
  if (value === "published") return BookStatus.PUBLISHED;
  if (value === "rejected") return BookStatus.REJECTED;
  if (value === "archived") return BookStatus.ARCHIVED;
  return null;
}

function parseOfferPrice(value: string) {
  if (!value) return null;
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function parseRentalDays(value: string) {
  if (!value) {
    return null;
  }

  const days = Number(value);

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return null;
  }

  return days;
}

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
    description: readField(formData, "description"),
    metadata: readField(formData, "metadata"),
  };
}

function parseMetadata(value: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
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

  const buyEnabled = values.buyOfferEnabled === "enabled";
  const rentEnabled = values.rentOfferEnabled === "enabled";

  if (!buyEnabled && !rentEnabled) {
    fieldErrors.buyOfferEnabled = "فعّل عرض شراء أو إيجار واحد على الأقل.";
    fieldErrors.rentOfferEnabled = "فعّل عرض شراء أو إيجار واحد على الأقل.";
  }

  const purchasePriceCents = parseOfferPrice(values.purchasePrice ?? "");
  if (buyEnabled && purchasePriceCents === null) {
    fieldErrors.purchasePrice = "أدخل سعر شراء صالحًا أكبر من الصفر.";
  }

  const rentalPriceCents = parseOfferPrice(values.rentalPrice ?? "");
  if (rentEnabled && rentalPriceCents === null) {
    fieldErrors.rentalPrice = "أدخل سعر إيجار صالحًا أكبر من الصفر.";
  }

  const rentalDays = parseRentalDays(values.rentalDays ?? "");
  if (rentEnabled && rentalDays === null) {
    fieldErrors.rentalDays = "مدة الإيجار يجب أن تكون رقمًا صحيحًا بين 1 و365 يومًا.";
  }

  if (values.description && values.description.length > 2000) {
    fieldErrors.description = "الوصف يجب ألا يتجاوز 2000 حرف.";
  }

  const metadata = parseMetadata(values.metadata ?? "");
  if (metadata === undefined) {
    fieldErrors.metadata = "صيغة metadata غير صحيحة. أدخل JSON صالحًا.";
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
    purchasePriceCents,
    rentalPriceCents,
    rentalDays,
    metadata,
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
      status: validation.status,
      authorId: values.authorId!,
      categoryId: values.categoryId!,
      offers: {
        create: [
          validation.buyEnabled
            ? {
                type: OfferType.PURCHASE,
                priceCents: validation.purchasePriceCents!,
                currency: CurrencyCode.SYP,
                isActive: true,
              }
            : undefined,
          validation.rentEnabled
            ? {
                type: OfferType.RENTAL,
                priceCents: validation.rentalPriceCents!,
                rentalDays: validation.rentalDays!,
                currency: CurrencyCode.SYP,
                isActive: true,
              }
            : undefined,
        ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
      },
    },
    select: { id: true },
  });

  revalidatePath("/admin/books");
  revalidatePath("/books");
  redirect(`/admin/books/${book.id}/edit`);
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
      status: validation.status,
      authorId: values.authorId!,
      categoryId: values.categoryId!,
      offers: {
        deleteMany: {
          type: { in: [OfferType.PURCHASE, OfferType.RENTAL] },
        },
        create: [
          validation.buyEnabled
            ? {
                type: OfferType.PURCHASE,
                priceCents: validation.purchasePriceCents!,
                currency: CurrencyCode.SYP,
                isActive: true,
              }
            : undefined,
          validation.rentEnabled
            ? {
                type: OfferType.RENTAL,
                priceCents: validation.rentalPriceCents!,
                rentalDays: validation.rentalDays!,
                currency: CurrencyCode.SYP,
                isActive: true,
              }
            : undefined,
        ].filter((value): value is NonNullable<typeof value> => Boolean(value)),
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
