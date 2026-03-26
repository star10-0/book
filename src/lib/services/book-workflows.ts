import { OfferType, type Prisma, type UserRole } from "@prisma/client";
import { buildBookOfferWrites, readField, type SharedBookFormValues } from "@/lib/services/book-form";
import type { BookFormValidationSuccess } from "@/lib/services/book-form-validation";

export type BookFormDefaults = {
  publicationStatus: "draft" | "pending_review" | "published" | "rejected" | "archived";
  buyOfferEnabled: "enabled" | "disabled";
  rentOfferEnabled: "enabled" | "disabled";
};

export function buildBookValues(formData: FormData, defaults: BookFormDefaults): SharedBookFormValues {
  return {
    titleAr: readField(formData, "titleAr"),
    slug: readField(formData, "slug").toLowerCase(),
    authorId: readField(formData, "authorId"),
    categoryId: readField(formData, "categoryId"),
    purchasePrice: readField(formData, "purchasePrice"),
    rentalPrice: readField(formData, "rentalPrice"),
    rentalDays: readField(formData, "rentalDays"),
    publicationStatus: readField(formData, "publicationStatus") || defaults.publicationStatus,
    buyOfferEnabled: readField(formData, "buyOfferEnabled") || defaults.buyOfferEnabled,
    rentOfferEnabled: readField(formData, "rentOfferEnabled") || defaults.rentOfferEnabled,
    allowReadingOnSite: readField(formData, "allowReadingOnSite"),
    allowDownloading: readField(formData, "allowDownloading"),
    previewOnly: readField(formData, "previewOnly"),
    paidOnlyMode: readField(formData, "paidOnlyMode"),
    description: readField(formData, "description"),
    metadata: readField(formData, "metadata"),
    metadataLanguage: readField(formData, "metadataLanguage"),
    metadataPages: readField(formData, "metadataPages"),
    metadataPublisher: readField(formData, "metadataPublisher"),
  };
}

export function buildBookWriteData(input: {
  values: SharedBookFormValues;
  validation: BookFormValidationSuccess;
  authorId: string;
  creatorId?: string;
}): Prisma.BookUncheckedCreateInput {
  return {
    titleAr: input.values.titleAr!,
    slug: input.values.slug!,
    descriptionAr: input.values.description || null,
    metadata: input.validation.metadata,
    contentAccessPolicy: input.validation.contentAccessPolicy,
    status: input.validation.status,
    authorId: input.authorId,
    categoryId: input.values.categoryId!,
    creatorId: input.creatorId,
    offers: {
      create: buildBookOfferWrites({
        buyEnabled: input.validation.buyEnabled,
        rentEnabled: input.validation.rentEnabled,
        purchasePriceCents: input.validation.purchasePriceCents,
        rentalPriceCents: input.validation.rentalPriceCents,
        rentalDays: input.validation.rentalDays,
      }),
    },
  };
}

export function buildBookOffersReplaceData(validation: BookFormValidationSuccess) {
  return {
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
  };
}

export function parseTextContentForm(formData: FormData): { textContent: string; error?: string } {
  const textContentValue = formData.get("textContent");
  const textContent = typeof textContentValue === "string" ? textContentValue.trim() : "";

  if (textContent.length > 500_000) {
    return {
      textContent,
      error: "المحتوى النصي طويل جدًا. الحد الأقصى 500,000 حرف.",
    };
  }

  return { textContent };
}

export function canManageCreatorBook(input: { userRole: UserRole; userId: string; creatorId: string | null }) {
  return input.userRole === "ADMIN" || input.creatorId === input.userId;
}
