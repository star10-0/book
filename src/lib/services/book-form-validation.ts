import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BOOK_SLUG_PATTERN,
  parseBookOffers,
  parseContentAccessPolicy,
  parseMetadata,
  parseStatus,
  type SharedBookFormValues,
} from "@/lib/services/book-form";

type BookFormFieldErrors = Partial<Record<keyof SharedBookFormValues, string>>;

export type BookFormValidationSuccess = {
  status: NonNullable<ReturnType<typeof parseStatus>>;
  buyEnabled: boolean;
  rentEnabled: boolean;
  purchasePriceCents: number | null;
  rentalPriceCents: number | null;
  rentalDays: number | null;
  contentAccessPolicy: ReturnType<typeof parseContentAccessPolicy>;
  metadata: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;
};

export type BookFormValidationResult =
  | { ok: true; data: BookFormValidationSuccess }
  | { ok: false; error: BookFormFieldErrors };

export type CreatorBookFormValidationResult =
  | { ok: true; data: BookFormValidationSuccess & { creatorAuthorId: string } }
  | { ok: false; error: BookFormFieldErrors };

type ValidateCommonBookFieldsInput = {
  values: SharedBookFormValues;
  bookId?: string;
  requireAuthor: true | { authorId: string | null; errorField?: keyof SharedBookFormValues };
};

async function validateCommonBookFields(input: ValidateCommonBookFieldsInput): Promise<BookFormValidationResult> {
  const fieldErrors: BookFormFieldErrors = {};
  const { values } = input;

  if (!values.titleAr || values.titleAr.length < 2) {
    fieldErrors.titleAr = "أدخل عنوانًا عربيًا صالحًا (حرفان على الأقل).";
  }

  if (!values.slug) {
    fieldErrors.slug = "حقل slug مطلوب.";
  } else if (!BOOK_SLUG_PATTERN.test(values.slug)) {
    fieldErrors.slug = "صيغة slug غير صحيحة. استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطة - فقط.";
  } else {
    const existing = await prisma.book.findUnique({ where: { slug: values.slug }, select: { id: true } });
    if (existing && existing.id !== input.bookId) {
      fieldErrors.slug = "هذا slug مستخدم لكتاب آخر.";
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

  if (input.requireAuthor === true) {
    if (!values.authorId) {
      fieldErrors.authorId = "اختر المؤلف.";
    } else {
      const author = await prisma.author.findUnique({ where: { id: values.authorId }, select: { id: true } });
      if (!author) {
        fieldErrors.authorId = "المؤلف المختار غير موجود.";
      }
    }
  } else {
    const errorField = input.requireAuthor.errorField ?? "titleAr";
    if (!input.requireAuthor.authorId) {
      fieldErrors[errorField] = "لا يمكن إنشاء كتاب قبل إكمال ملف الكاتب.";
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
    return { ok: false, error: fieldErrors };
  }

  return {
    ok: true,
    data: {
      status,
      buyEnabled,
      rentEnabled,
      purchasePriceCents: offerValues.purchasePriceCents,
      rentalPriceCents: offerValues.rentalPriceCents,
      rentalDays: offerValues.rentalDays,
      contentAccessPolicy: parseContentAccessPolicy(values),
      metadata: metadata.ok ? (metadata.data ?? Prisma.JsonNull) : undefined,
    },
  };
}

export async function validateAdminBookForm(values: SharedBookFormValues, bookId?: string) {
  return validateCommonBookFields({
    values,
    bookId,
    requireAuthor: true,
  });
}

export async function resolveCreatorAuthorId(creatorId: string) {
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: creatorId },
    select: { authorId: true },
  });
  return creatorProfile?.authorId ?? null;
}

export async function validateCreatorBookForm(
  values: SharedBookFormValues,
  creatorAuthorId: string | null,
  bookId?: string,
): Promise<CreatorBookFormValidationResult> {
  const validation = await validateCommonBookFields({
    values,
    bookId,
    requireAuthor: { authorId: creatorAuthorId },
  });

  if (!validation.ok) {
    return validation;
  }

  if (!creatorAuthorId) {
    return { ok: false, error: { titleAr: "لا يمكن إنشاء كتاب قبل إكمال ملف الكاتب." } };
  }

  return {
    ok: true,
    data: {
      ...validation.data,
      creatorAuthorId,
    },
  };
}
