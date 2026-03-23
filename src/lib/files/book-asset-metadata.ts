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

export const BOOK_ASSET_MIME_TYPES: Record<(typeof FILE_KINDS_FOR_BOOK_ASSETS)[number], string[]> = {
  [FileKind.COVER_IMAGE]: ["image/jpeg", "image/png", "image/webp"],
  [FileKind.EPUB]: ["application/epub+zip"],
  [FileKind.PDF]: ["application/pdf"],
};

export const BOOK_ASSET_EXTENSIONS: Record<(typeof FILE_KINDS_FOR_BOOK_ASSETS)[number], string[]> = {
  [FileKind.COVER_IMAGE]: [".jpg", ".jpeg", ".png", ".webp"],
  [FileKind.EPUB]: [".epub"],
  [FileKind.PDF]: [".pdf"],
};

export const isSupportedAdminBookAssetKind = (kind: FileKind): boolean => {
  return FILE_KINDS_FOR_BOOK_ASSETS.includes(kind as (typeof FILE_KINDS_FOR_BOOK_ASSETS)[number]);
};
