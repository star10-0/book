import path from "node:path";
import { FileKind, StorageProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-session";
import { BOOK_ASSET_EXTENSIONS, BOOK_ASSET_MIME_TYPES, isSupportedAdminBookAssetKind } from "@/lib/files/book-asset-metadata";
import { createStorageProvider } from "@/lib/files/storage-provider";
import { validateFileSignature, validateUploadSize } from "@/lib/files/upload-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseKind(input: string | null): FileKind | null {
  if (!input) {
    return null;
  }

  const normalized = input.toUpperCase();

  if (normalized === FileKind.COVER_IMAGE) return FileKind.COVER_IMAGE;
  if (normalized === FileKind.PDF) return FileKind.PDF;
  if (normalized === FileKind.EPUB) return FileKind.EPUB;

  return null;
}

function inferStorageProviderEnum(providerKey: string): StorageProvider {
  if (providerKey === "s3") {
    return StorageProvider.S3;
  }

  if (providerKey === "r2") {
    return StorageProvider.CLOUDFLARE_R2;
  }

  return StorageProvider.LOCAL;
}

function isAllowedFileForKind(kind: FileKind, fileName: string, mimeType: string): boolean {
  const allowedMimes = BOOK_ASSET_MIME_TYPES[kind as keyof typeof BOOK_ASSET_MIME_TYPES];
  const allowedExtensions = BOOK_ASSET_EXTENSIONS[kind as keyof typeof BOOK_ASSET_EXTENSIONS];
  const extension = path.extname(fileName).toLowerCase();

  return allowedMimes.includes(mimeType) && allowedExtensions.includes(extension);
}

export async function GET(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");

  const assets = await prisma.bookFile.findMany({
    where: {
      ...(bookId ? { bookId } : {}),
    },
    take: 100,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      bookId: true,
      kind: true,
      storageProvider: true,
      storageKey: true,
      publicUrl: true,
      originalFileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      metadata: true,
    },
  });

  return NextResponse.json({ items: assets });
}

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const bookId = formData.get("bookId");
  const kind = parseKind(typeof formData.get("kind") === "string" ? (formData.get("kind") as string) : null);
  const file = formData.get("file");

  if (typeof bookId !== "string" || !bookId.trim() || !kind || !(file instanceof File)) {
    return NextResponse.json({ error: "الحقول bookId و kind و file مطلوبة." }, { status: 400 });
  }

  if (!isSupportedAdminBookAssetKind(kind)) {
    return NextResponse.json({ error: "الأنواع المدعومة حاليًا: COVER_IMAGE, EPUB, PDF" }, { status: 400 });
  }

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, contentAccessPolicy: true } });

  if (!book) {
    return NextResponse.json({ error: "الكتاب المطلوب غير موجود." }, { status: 404 });
  }

  if (!isAllowedFileForKind(kind, file.name, file.type)) {
    return NextResponse.json({ error: "صيغة الملف أو نوع MIME غير مدعوم لهذا النوع." }, { status: 400 });
  }

  const sizeValidation = validateUploadSize(kind, file.size);
  if (!sizeValidation.ok) {
    return NextResponse.json({ error: `حجم الملف يتجاوز الحد المسموح (${Math.floor(sizeValidation.maxBytes / (1024 * 1024))}MB).` }, { status: 400 });
  }

  const provider = createStorageProvider();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!validateFileSignature(kind, file.name, bytes)) {
    return NextResponse.json({ error: "بصمة الملف لا تطابق نوعه المعلن." }, { status: 400 });
  }

  const shouldBePublic =
    kind === FileKind.COVER_IMAGE ? true : book.contentAccessPolicy === "PUBLIC_READ" || book.contentAccessPolicy === "PUBLIC_DOWNLOAD";

  const uploaded = await provider.uploadFile({
    bytes,
    folder: `books/${book.id}/${kind.toLowerCase()}`,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type,
    visibility: shouldBePublic ? "public" : "private",
  });

  const previousAsset = await prisma.bookFile.findFirst({
    where: {
      bookId: book.id,
      kind,
      sortOrder: 0,
    },
    select: {
      id: true,
      storageKey: true,
      bucket: true,
      region: true,
      publicUrl: true,
    },
  });

  if (previousAsset) {
    await provider.deleteFile({
      key: previousAsset.storageKey,
      bucket: previousAsset.bucket ?? undefined,
      region: previousAsset.region ?? undefined,
      publicUrl: previousAsset.publicUrl ?? undefined,
    });
  }

  const savedAsset = await prisma.$transaction(async (tx) => {
    const asset = await tx.bookFile.upsert({
      where: {
        bookId_kind_sortOrder: {
          bookId: book.id,
          kind,
          sortOrder: 0,
        },
      },
      update: {
        storageProvider: inferStorageProviderEnum(provider.key),
        storageKey: uploaded.pointer.key,
        bucket: uploaded.pointer.bucket ?? null,
        region: uploaded.pointer.region ?? null,
        publicUrl: uploaded.publicUrl,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      create: {
        bookId: book.id,
        kind,
        sortOrder: 0,
        storageProvider: inferStorageProviderEnum(provider.key),
        storageKey: uploaded.pointer.key,
        bucket: uploaded.pointer.bucket ?? null,
        region: uploaded.pointer.region ?? null,
        publicUrl: uploaded.publicUrl,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    if (kind === FileKind.COVER_IMAGE) {
      await tx.book.update({
        where: { id: book.id },
        data: {
          coverImageUrl: uploaded.publicUrl,
        },
      });
    }

    return asset;
  });

  return NextResponse.json({
    item: savedAsset,
    message: "تم رفع الملف وربطه بالكتاب بنجاح.",
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId");

  if (!assetId) {
    return NextResponse.json({ error: "assetId مطلوب." }, { status: 400 });
  }

  const asset = await prisma.bookFile.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      kind: true,
      bookId: true,
      storageKey: true,
      bucket: true,
      region: true,
      publicUrl: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });
  }

  const provider = createStorageProvider();

  await provider.deleteFile({
    key: asset.storageKey,
    bucket: asset.bucket ?? undefined,
    region: asset.region ?? undefined,
    publicUrl: asset.publicUrl ?? undefined,
  });

  await prisma.$transaction(async (tx) => {
    await tx.bookFile.delete({ where: { id: asset.id } });

    if (asset.kind === FileKind.COVER_IMAGE) {
      await tx.book.update({
        where: { id: asset.bookId },
        data: { coverImageUrl: null },
      });
    }
  });

  return NextResponse.json({ message: "تم حذف الملف بنجاح." });
}
