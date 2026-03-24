"use server";

import { BookStatus, OfferType, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreator, requireUser } from "@/lib/auth-session";
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

export type StudioProfileState = {
  error?: string;
  success?: string;
};

export type StudioBookFormValues = SharedBookFormValues;

export type StudioBookFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<keyof StudioBookFormValues, string>>;
  values?: StudioBookFormValues;
};

export type StudioBookTextContentState = {
  error?: string;
  success?: string;
};

function readAnyField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function makeUniqueCreatorSlug(seed: string) {
  const base = slugify(seed) || `creator-${Date.now()}`;
  let candidate = base;
  let counter = 1;

  while (true) {
    const exists = await prisma.creatorProfile.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!exists) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

function buildBookValues(formData: FormData): StudioBookFormValues {
  return {
    titleAr: readField(formData, "titleAr"),
    slug: readField(formData, "slug").toLowerCase(),
    authorId: readField(formData, "authorId"),
    categoryId: readField(formData, "categoryId"),
    purchasePrice: readField(formData, "purchasePrice"),
    rentalPrice: readField(formData, "rentalPrice"),
    rentalDays: readField(formData, "rentalDays"),
    publicationStatus: readField(formData, "publicationStatus") || "draft",
    buyOfferEnabled: readField(formData, "buyOfferEnabled") || "enabled",
    rentOfferEnabled: readField(formData, "rentOfferEnabled") || "enabled",
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

async function validateBookForm(values: StudioBookFormValues, creatorId: string, bookId?: string) {
  const fieldErrors: StudioBookFormState["fieldErrors"] = {};

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

  if (!values.categoryId) {
    fieldErrors.categoryId = "اختر التصنيف.";
  } else {
    const category = await prisma.category.findUnique({ where: { id: values.categoryId }, select: { id: true } });
    if (!category) {
      fieldErrors.categoryId = "التصنيف المختار غير موجود.";
    }
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: creatorId },
    select: { authorId: true },
  });

  if (!creatorProfile?.authorId) {
    fieldErrors.titleAr = "لا يمكن إنشاء كتاب قبل إكمال ملف الكاتب.";
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

  if (Object.keys(fieldErrors).length > 0 || !status || !creatorProfile?.authorId) {
    return { ok: false as const, fieldErrors };
  }

  return {
    ok: true as const,
    status,
    creatorAuthorId: creatorProfile.authorId,
    buyEnabled,
    rentEnabled,
    purchasePriceCents: offerValues.purchasePriceCents,
    rentalPriceCents: offerValues.rentalPriceCents,
    rentalDays: offerValues.rentalDays,
    contentAccessPolicy: parseContentAccessPolicy(values),
    metadata: metadata.ok ? (metadata.data ?? Prisma.JsonNull) : undefined,
  };
}

export async function becomeCreatorAction(_prevState: StudioProfileState, formData: FormData): Promise<StudioProfileState> {
  const user = await requireUser({ callbackUrl: "/account/profile" });

  if (user.role === UserRole.CREATOR || user.role === UserRole.ADMIN) {
    return { success: "أنت تملك صلاحية الكاتب بالفعل." };
  }

  const displayName = readAnyField(formData, "displayName") || user.name || user.email.split("@")[0];
  const bio = readAnyField(formData, "bio");

  if (displayName.length < 2) {
    return { error: "اسم الكاتب يجب أن يتكون من حرفين على الأقل." };
  }

  const slug = await makeUniqueCreatorSlug(displayName);

  await prisma.$transaction(async (tx) => {
    const author = await tx.author.create({
      data: {
        nameAr: displayName,
        bioAr: bio || null,
        slug,
      },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        role: UserRole.CREATOR,
        creatorProfile: {
          upsert: {
            update: {
              displayName,
              slug,
              bio: bio || null,
              authorId: author.id,
            },
            create: {
              displayName,
              slug,
              bio: bio || null,
              authorId: author.id,
            },
          },
        },
      },
    });
  });

  revalidatePath("/account/profile");
  revalidatePath("/");
  redirect("/studio");
}

export async function updateCreatorProfileAction(_prevState: StudioProfileState, formData: FormData): Promise<StudioProfileState> {
  const user = await requireCreator({ callbackUrl: "/studio/profile" });

  const displayName = readAnyField(formData, "displayName");
  const slugInput = readAnyField(formData, "slug").toLowerCase();
  const bio = readAnyField(formData, "bio");

  if (displayName.length < 2) {
    return { error: "اسم الكاتب يجب أن يتكون من حرفين على الأقل." };
  }

  const slug = slugify(slugInput || displayName);

  if (!BOOK_SLUG_PATTERN.test(slug)) {
    return { error: "الـ slug غير صالح. استخدم أحرفًا صغيرة وأرقامًا وشرطة -." };
  }

  const existingSlug = await prisma.creatorProfile.findUnique({ where: { slug }, select: { userId: true } });
  if (existingSlug && existingSlug.userId !== user.id) {
    return { error: "هذا الرابط التعريفي مستخدم من كاتب آخر." };
  }

  await prisma.$transaction(async (tx) => {
    const profile = await tx.creatorProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName,
        slug,
        bio: bio || null,
      },
      create: {
        userId: user.id,
        displayName,
        slug,
        bio: bio || null,
      },
      select: {
        authorId: true,
      },
    });

    if (profile.authorId) {
      await tx.author.update({
        where: { id: profile.authorId },
        data: {
          nameAr: displayName,
          slug,
          bioAr: bio || null,
        },
      });
    } else {
      const author = await tx.author.create({
        data: { nameAr: displayName, slug, bioAr: bio || null },
        select: { id: true },
      });

      await tx.creatorProfile.update({
        where: { userId: user.id },
        data: { authorId: author.id },
      });
    }

    if (user.role === UserRole.USER) {
      await tx.user.update({ where: { id: user.id }, data: { role: UserRole.CREATOR } });
    }
  });

  revalidatePath("/studio/profile");
  revalidatePath(`/creators/${slug}`);

  return { success: "تم تحديث ملف الكاتب بنجاح." };
}

export async function createStudioBookAction(_prevState: StudioBookFormState, formData: FormData): Promise<StudioBookFormState> {
  const user = await requireCreator({ callbackUrl: "/studio/books/new" });
  const values = buildBookValues(formData);
  const validation = await validateBookForm(values, user.id);

  if (!validation.ok) {
    return { error: "تحقق من البيانات المدخلة ثم أعد المحاولة.", fieldErrors: validation.fieldErrors, values };
  }

  const book = await prisma.book.create({
    data: {
      titleAr: values.titleAr!,
      slug: values.slug!,
      descriptionAr: values.description || null,
      metadata: validation.metadata,
      contentAccessPolicy: validation.contentAccessPolicy,
      status: validation.status,
      creatorId: user.id,
      authorId: validation.creatorAuthorId,
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

  revalidatePath("/studio/books");
  revalidatePath("/books");
  redirect(`/studio/books/${book.id}/edit?focus=content`);
}

export async function updateStudioBookTextContentAction(
  bookId: string,
  _prevState: StudioBookTextContentState,
  formData: FormData,
): Promise<StudioBookTextContentState> {
  const user = await requireCreator({ callbackUrl: `/studio/books/${bookId}/edit` });

  const targetBook = await prisma.book.findUnique({ where: { id: bookId }, select: { creatorId: true } });
  if (!targetBook || (user.role !== UserRole.ADMIN && targetBook.creatorId !== user.id)) {
    return { error: "لا يمكنك تعديل محتوى هذا الكتاب." };
  }

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

  revalidatePath(`/studio/books/${bookId}/edit`);
  revalidatePath("/studio/books");
  revalidatePath("/books");

  return {
    success: textContent ? "تم حفظ المحتوى النصي بنجاح." : "تم مسح المحتوى النصي من الكتاب.",
  };
}

export async function updateStudioBookAction(bookId: string, _prevState: StudioBookFormState, formData: FormData): Promise<StudioBookFormState> {
  const user = await requireCreator({ callbackUrl: `/studio/books/${bookId}/edit` });

  const targetBook = await prisma.book.findUnique({ where: { id: bookId }, select: { creatorId: true } });
  if (!targetBook || (user.role !== UserRole.ADMIN && targetBook.creatorId !== user.id)) {
    return { error: "لا يمكنك تعديل هذا الكتاب." };
  }

  const values = buildBookValues(formData);
  const validation = await validateBookForm(values, user.id, bookId);

  if (!validation.ok) {
    return { error: "تحقق من البيانات المدخلة ثم أعد المحاولة.", fieldErrors: validation.fieldErrors, values };
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
      authorId: validation.creatorAuthorId,
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

  revalidatePath("/studio/books");
  revalidatePath(`/studio/books/${bookId}/edit`);
  revalidatePath("/books");

  return {
    success: "تم حفظ بيانات الكتاب والعروض بنجاح.",
    values,
  };
}

export async function publishStudioBookAction(formData: FormData) {
  const user = await requireCreator({ callbackUrl: "/studio/books" });
  const bookId = formData.get("bookId");

  if (typeof bookId !== "string" || !bookId) {
    return;
  }

  const targetBook = await prisma.book.findUnique({ where: { id: bookId }, select: { creatorId: true } });
  if (!targetBook || (user.role !== UserRole.ADMIN && targetBook.creatorId !== user.id)) {
    return;
  }

  await prisma.book.update({ where: { id: bookId }, data: { status: BookStatus.PUBLISHED } });
  revalidatePath("/studio/books");
  revalidatePath("/books");
}

export async function unpublishStudioBookAction(formData: FormData) {
  const user = await requireCreator({ callbackUrl: "/studio/books" });
  const bookId = formData.get("bookId");

  if (typeof bookId !== "string" || !bookId) {
    return;
  }

  const targetBook = await prisma.book.findUnique({ where: { id: bookId }, select: { creatorId: true } });
  if (!targetBook || (user.role !== UserRole.ADMIN && targetBook.creatorId !== user.id)) {
    return;
  }

  await prisma.book.update({ where: { id: bookId }, data: { status: BookStatus.DRAFT } });
  revalidatePath("/studio/books");
  revalidatePath("/books");
}
