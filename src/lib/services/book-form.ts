import { BookStatus, ContentAccessPolicy, CurrencyCode, OfferType, Prisma } from "@prisma/client";
import { err, ok, type ServiceResult } from "@/lib/services/result";

export const BOOK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DEFAULT_RENTAL_DAYS = "14";

export type SharedBookFormValues = {
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
  allowReadingOnSite?: string;
  allowDownloading?: string;
  previewOnly?: string;
  paidOnlyMode?: string;
  description?: string;
  metadata?: string;
  metadataLanguage?: string;
  metadataPages?: string;
  metadataPublisher?: string;
};

export type AccessSettingsValues = Pick<SharedBookFormValues, "allowReadingOnSite" | "allowDownloading" | "previewOnly" | "paidOnlyMode">;

export type ContentAccessResolution =
  | {
      ok: true;
      policy: ContentAccessPolicy;
      values: AccessSettingsValues;
    }
  | {
      ok: false;
      reason: "none-selected" | "conflict";
    };

export type ParsedBookOffers = {
  buyEnabled: boolean;
  rentEnabled: boolean;
  purchasePriceCents: number | null;
  rentalPriceCents: number | null;
  rentalDays: number | null;
};

export type MetadataParseError = "invalid-json" | "invalid-pages";

export function readField(formData: FormData, key: keyof SharedBookFormValues) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function parseStatus(value: string): BookStatus | null {
  if (value === "draft") return BookStatus.DRAFT;
  if (value === "pending_review") return BookStatus.PENDING_REVIEW;
  if (value === "published") return BookStatus.PUBLISHED;
  if (value === "rejected") return BookStatus.REJECTED;
  if (value === "archived") return BookStatus.ARCHIVED;
  return null;
}

export function parseOfferPrice(value: string) {
  if (!value) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function parseRentalDays(value: string) {
  if (!value) {
    return null;
  }

  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return null;
  }

  return days;
}

export function parseContentAccessPolicy(values: SharedBookFormValues) {
  const resolved = resolveContentAccessPolicy(values);

  if (resolved.ok) {
    return resolved.policy;
  }

  return ContentAccessPolicy.PAID_ONLY;
}

export function buildAccessSettingsFromPolicy(policy: ContentAccessPolicy): AccessSettingsValues {
  if (policy === ContentAccessPolicy.PAID_ONLY) {
    return {
      paidOnlyMode: "enabled",
      previewOnly: "disabled",
      allowReadingOnSite: "disabled",
      allowDownloading: "disabled",
    };
  }

  if (policy === ContentAccessPolicy.PREVIEW_ONLY) {
    return {
      paidOnlyMode: "disabled",
      previewOnly: "enabled",
      allowReadingOnSite: "disabled",
      allowDownloading: "disabled",
    };
  }

  if (policy === ContentAccessPolicy.PUBLIC_DOWNLOAD) {
    return {
      paidOnlyMode: "disabled",
      previewOnly: "disabled",
      allowReadingOnSite: "enabled",
      allowDownloading: "enabled",
    };
  }

  return {
    paidOnlyMode: "disabled",
    previewOnly: "disabled",
    allowReadingOnSite: "enabled",
    allowDownloading: "disabled",
  };
}

export function resolveContentAccessPolicy(values: AccessSettingsValues): ContentAccessResolution {
  const paidOnlyMode = values.paidOnlyMode === "enabled";
  const previewOnly = values.previewOnly === "enabled";
  const allowDownloading = values.allowDownloading === "enabled";
  const allowReadingOnSite = values.allowReadingOnSite === "enabled";

  if (paidOnlyMode && !previewOnly && !allowReadingOnSite && !allowDownloading) {
    return { ok: true, policy: ContentAccessPolicy.PAID_ONLY, values: buildAccessSettingsFromPolicy(ContentAccessPolicy.PAID_ONLY) };
  }

  if (previewOnly && !paidOnlyMode && !allowReadingOnSite && !allowDownloading) {
    return { ok: true, policy: ContentAccessPolicy.PREVIEW_ONLY, values: buildAccessSettingsFromPolicy(ContentAccessPolicy.PREVIEW_ONLY) };
  }

  if (allowDownloading && !paidOnlyMode && !previewOnly) {
    return { ok: true, policy: ContentAccessPolicy.PUBLIC_DOWNLOAD, values: buildAccessSettingsFromPolicy(ContentAccessPolicy.PUBLIC_DOWNLOAD) };
  }

  if (allowReadingOnSite && !paidOnlyMode && !previewOnly && !allowDownloading) {
    return { ok: true, policy: ContentAccessPolicy.PUBLIC_READ, values: buildAccessSettingsFromPolicy(ContentAccessPolicy.PUBLIC_READ) };
  }

  if (!paidOnlyMode && !previewOnly && !allowReadingOnSite && !allowDownloading) {
    return { ok: false, reason: "none-selected" };
  }

  return { ok: false, reason: "conflict" };
}

export function parseMetadata(values: SharedBookFormValues): ServiceResult<Prisma.InputJsonObject | null, MetadataParseError> {
  const baseValue = values.metadata ?? "";
  let metadata: Record<string, Prisma.InputJsonValue> = {};

  if (baseValue) {
    try {
      const parsed = JSON.parse(baseValue);

      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        return err("invalid-json");
      }

      metadata = parsed as Record<string, Prisma.InputJsonValue>;
    } catch {
      return err("invalid-json");
    }
  }

  if (values.metadataLanguage) {
    metadata.language = values.metadataLanguage;
  }

  if (values.metadataPublisher) {
    metadata.publisher = values.metadataPublisher;
  }

  if (values.metadataPages) {
    const pages = Number(values.metadataPages);

    if (!Number.isInteger(pages) || pages <= 0) {
      return err("invalid-pages");
    }

    metadata.pages = pages;
  }

  return ok(Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonObject) : null);
}

export function parseBookOffers(values: SharedBookFormValues): ParsedBookOffers {
  const buyEnabled = values.buyOfferEnabled === "enabled";
  const rentEnabled = values.rentOfferEnabled === "enabled";

  return {
    buyEnabled,
    rentEnabled,
    purchasePriceCents: parseOfferPrice(values.purchasePrice ?? ""),
    rentalPriceCents: parseOfferPrice(values.rentalPrice ?? ""),
    rentalDays: parseRentalDays(values.rentalDays ?? ""),
  };
}

export function buildBookOfferWrites(input: ParsedBookOffers) {
  const writes = [
    input.buyEnabled
      ? {
          type: OfferType.PURCHASE,
          priceCents: input.purchasePriceCents,
          currency: CurrencyCode.SYP,
          isActive: true,
          rentalDays: null,
        }
      : undefined,
    input.rentEnabled
      ? {
          type: OfferType.RENTAL,
          priceCents: input.rentalPriceCents,
          rentalDays: input.rentalDays,
          currency: CurrencyCode.SYP,
          isActive: true,
        }
      : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));

  return writes.map((write) => ({ ...write, priceCents: write.priceCents! }));
}

export function buildBookInitialValues(input: {
  titleAr: string;
  slug: string;
  authorId?: string;
  categoryId: string;
  status: BookStatus;
  contentAccessPolicy: ContentAccessPolicy;
  descriptionAr: string | null;
  metadata: Prisma.JsonValue;
  offers: Array<{ type: OfferType; priceCents: number; rentalDays: number | null; isActive: boolean }>;
}): SharedBookFormValues {
  const purchaseOffer = input.offers.find((offer) => offer.type === OfferType.PURCHASE);
  const rentalOffer = input.offers.find((offer) => offer.type === OfferType.RENTAL);
  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : null;

  return {
    titleAr: input.titleAr,
    slug: input.slug,
    authorId: input.authorId,
    categoryId: input.categoryId,
    purchasePrice: purchaseOffer ? String(purchaseOffer.priceCents / 100) : "",
    rentalPrice: rentalOffer ? String(rentalOffer.priceCents / 100) : "",
    rentalDays: rentalOffer?.rentalDays ? String(rentalOffer.rentalDays) : DEFAULT_RENTAL_DAYS,
    publicationStatus: input.status.toLowerCase(),
    buyOfferEnabled: purchaseOffer?.isActive ? "enabled" : "disabled",
    rentOfferEnabled: rentalOffer?.isActive ? "enabled" : "disabled",
    ...buildAccessSettingsFromPolicy(input.contentAccessPolicy),
    description: input.descriptionAr ?? "",
    metadata: input.metadata ? JSON.stringify(input.metadata, null, 2) : "",
    metadataLanguage: typeof metadata?.language === "string" ? metadata.language : "",
    metadataPages: typeof metadata?.pages === "number" ? String(metadata.pages) : "",
    metadataPublisher: typeof metadata?.publisher === "string" ? metadata.publisher : "",
  };
}
