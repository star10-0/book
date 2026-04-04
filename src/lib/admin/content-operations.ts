import { BookFormat, BookStatus, FileKind, OfferType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OFFER_TYPES: OfferType[] = [OfferType.PURCHASE, OfferType.RENTAL];
const READABLE_FILE_KINDS: FileKind[] = [FileKind.PDF, FileKind.EPUB];

export type ContentOperationalSignal =
  | "missing_cover"
  | "missing_file"
  | "missing_active_offer"
  | "missing_author_link"
  | "missing_category_link"
  | "pending_review"
  | "published_incomplete_metadata"
  | "broken_access_readiness";

export type ContentOperationalBook = {
  id: string;
  titleAr: string;
  slug: string;
  status: BookStatus;
  format: BookFormat;
  authorName: string | null;
  categoryName: string | null;
  createdAt: Date;
  signals: ContentOperationalSignal[];
};

export type ContentOperationsSnapshot = {
  books: ContentOperationalBook[];
  counts: Record<ContentOperationalSignal, number>;
  queues: {
    review: ContentOperationalBook[];
    broken: ContentOperationalBook[];
    incompleteMetadata: ContentOperationalBook[];
  };
};

type ContentOpsRawBook = {
  id: string;
  titleAr: string;
  slug: string;
  status: BookStatus;
  format: BookFormat;
  descriptionAr: string | null;
  textContent: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  author: { nameAr: string } | null;
  category: { nameAr: string } | null;
  files: Array<{
    kind: FileKind;
    storageKey: string;
    publicUrl: string | null;
    sizeBytes: number | null;
  }>;
  offers: Array<{
    type: OfferType;
    isActive: boolean;
    priceCents: number;
  }>;
};

function isValidMetadata(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const value = metadata as Record<string, unknown>;
  return typeof value.language === "string" && value.language.trim().length > 0 && typeof value.publisher === "string" && value.publisher.trim().length > 0;
}

function computeSignals(book: ContentOpsRawBook): ContentOperationalSignal[] {
  const signals: ContentOperationalSignal[] = [];

  const hasCover = book.files.some((file) => file.kind === FileKind.COVER_IMAGE);
  if (!hasCover) {
    signals.push("missing_cover");
  }

  const hasReadableFile = book.files.some((file) => READABLE_FILE_KINDS.includes(file.kind));
  const hasTextContent = Boolean(book.textContent?.trim());
  if (!hasReadableFile && !hasTextContent) {
    signals.push("missing_file");
  }

  const hasActiveOffer = book.offers.some((offer) => OFFER_TYPES.includes(offer.type) && offer.isActive && offer.priceCents > 0);
  if (!hasActiveOffer) {
    signals.push("missing_active_offer");
  }

  if (!book.author) {
    signals.push("missing_author_link");
  }

  if (!book.category) {
    signals.push("missing_category_link");
  }

  if (book.status === BookStatus.PENDING_REVIEW) {
    signals.push("pending_review");
  }

  if (book.status === BookStatus.PUBLISHED && (!book.descriptionAr?.trim() || !isValidMetadata(book.metadata))) {
    signals.push("published_incomplete_metadata");
  }

  const brokenFile = book.files.some((file) => {
    if (!READABLE_FILE_KINDS.includes(file.kind)) {
      return false;
    }

    return file.storageKey.trim().length === 0 || (file.publicUrl !== null && file.publicUrl.trim().length === 0) || (file.sizeBytes !== null && file.sizeBytes <= 0);
  });

  if (brokenFile) {
    signals.push("broken_access_readiness");
  }

  return signals;
}

export function buildContentOperationsSnapshot(books: ContentOpsRawBook[]): ContentOperationsSnapshot {
  const mappedBooks = books.map((book) => ({
    id: book.id,
    titleAr: book.titleAr,
    slug: book.slug,
    status: book.status,
    format: book.format,
    authorName: book.author?.nameAr ?? null,
    categoryName: book.category?.nameAr ?? null,
    createdAt: book.createdAt,
    signals: computeSignals(book),
  }));

  const counts: Record<ContentOperationalSignal, number> = {
    missing_cover: 0,
    missing_file: 0,
    missing_active_offer: 0,
    missing_author_link: 0,
    missing_category_link: 0,
    pending_review: 0,
    published_incomplete_metadata: 0,
    broken_access_readiness: 0,
  };

  for (const book of mappedBooks) {
    for (const signal of book.signals) {
      counts[signal] += 1;
    }
  }

  return {
    books: mappedBooks,
    counts,
    queues: {
      review: mappedBooks.filter((book) => book.signals.includes("pending_review")),
      broken: mappedBooks.filter(
        (book) =>
          book.signals.includes("broken_access_readiness") ||
          book.signals.includes("missing_file") ||
          book.signals.includes("missing_cover") ||
          book.signals.includes("missing_active_offer"),
      ),
      incompleteMetadata: mappedBooks.filter((book) => book.signals.includes("published_incomplete_metadata")),
    },
  };
}

export async function loadContentOperationsSnapshot(): Promise<ContentOperationsSnapshot> {
  const books = await prisma.book.findMany({
    select: {
      id: true,
      titleAr: true,
      slug: true,
      status: true,
      format: true,
      descriptionAr: true,
      textContent: true,
      metadata: true,
      createdAt: true,
      author: { select: { nameAr: true } },
      category: { select: { nameAr: true } },
      files: {
        where: { sortOrder: 0, kind: { in: [FileKind.COVER_IMAGE, ...READABLE_FILE_KINDS] } },
        select: {
          kind: true,
          storageKey: true,
          publicUrl: true,
          sizeBytes: true,
        },
      },
      offers: {
        where: { type: { in: OFFER_TYPES } },
        select: { type: true, isActive: true, priceCents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return buildContentOperationsSnapshot(books);
}
