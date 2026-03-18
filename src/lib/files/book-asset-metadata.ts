import { FileKind } from "@prisma/client";

export type CoverImageMetadata = {
  altAr?: string;
  altEn?: string;
  width?: number;
  height?: number;
  dominantColor?: string;
};

export type EpubMetadata = {
  version?: string;
  packagePath?: string;
  language?: string;
  hasToc?: boolean;
};

export type PdfMetadata = {
  version?: string;
  pageCount?: number;
  language?: string;
  hasSelectableText?: boolean;
};

export type BookAssetMetadata = CoverImageMetadata | EpubMetadata | PdfMetadata | Record<string, unknown>;

export const FILE_KINDS_FOR_BOOK_ASSETS = [FileKind.COVER_IMAGE, FileKind.EPUB, FileKind.PDF] as const;

export const isSupportedAdminBookAssetKind = (kind: FileKind): boolean => {
  return FILE_KINDS_FOR_BOOK_ASSETS.includes(kind as (typeof FILE_KINDS_FOR_BOOK_ASSETS)[number]);
};
