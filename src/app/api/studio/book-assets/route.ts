import { FileKind, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireCreator } from "@/lib/auth-session";
import { canManageCreatorBook } from "@/lib/authz";
import { isSupportedAdminBookAssetKind } from "@/lib/files/book-asset-metadata";
import { BookStorageService, mapStorageProviderKeyToEnum } from "@/lib/files/book-storage-service";
import { getUploadValidationArabicMessage, validateUploadPayload } from "@/lib/files/upload-validation";
import { getClientIp } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, isSameOriginMutation, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

export const runtime = "nodejs";

function parseKind(input: string | null): FileKind | null {
  if (!input) return null;
  const normalized = input.toUpperCase();
  if (normalized === FileKind.COVER_IMAGE) return FileKind.COVER_IMAGE;
  if (normalized === FileKind.PDF) return FileKind.PDF;
  if (normalized === FileKind.EPUB) return FileKind.EPUB;
  return null;
}

async function canManageBook(userId: string, role: UserRole, bookId: string) {
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, creatorId: true } });
  if (!book) return null;
  return canManageCreatorBook({ role, actorUserId: userId, bookCreatorId: book.creatorId }) ? book : null;
}

export async function GET(request: Request) {
  const user = await requireCreator();
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "bookId مطلوب." }, { status: 400 });
  }

  const book = await canManageBook(user.id, user.role, bookId);
  if (!book) {
    return NextResponse.json({ error: "غير مسموح بالوصول لهذا الكتاب." }, { status: 403 });
  }

  const assets = await prisma.bookFile.findMany({
    where: { bookId: book.id },
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
  const user = await requireCreator();

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `studio:book-assets:upload:${getClientIp(request)}`, limit: 40, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const formData = await request.formData();
  const bookId = formData.get("bookId");
  const kind = parseKind(typeof formData.get("kind") === "string" ? (formData.get("kind") as string) : null);
  const file = formData.get("file");

  if (typeof bookId !== "string" || !bookId.trim() || !kind || !(file instanceof File)) {
    return NextResponse.json({ error: "الحقول bookId و kind و file مطلوبة." }, { status: 400 });
  }

  const book = await canManageBook(user.id, user.role, bookId);
  if (!book) {
    return NextResponse.json({ error: "غير مسموح بالوصول لهذا الكتاب." }, { status: 403 });
  }

  if (!isSupportedAdminBookAssetKind(kind)) {
    return NextResponse.json({ error: "الأنواع المدعومة حاليًا: COVER_IMAGE, EPUB, PDF" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateUploadPayload({
    kind,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    bytes,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: getUploadValidationArabicMessage(validation.code, validation.maxBytes) }, { status: 400 });
  }

  const storageService = new BookStorageService();

  const uploaded = await storageService.uploadBookAsset({
    bookId: book.id,
    kind,
    bytes,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type,
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
    await storageService.deleteBookAsset({
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
        storageProvider: mapStorageProviderKeyToEnum(storageService.providerKey),
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
        storageProvider: mapStorageProviderKeyToEnum(storageService.providerKey),
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

  return NextResponse.json({ item: savedAsset, message: "تم رفع الملف وربطه بالكتاب بنجاح." });
}

export async function DELETE(request: Request) {
  const user = await requireCreator();

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `studio:book-assets:delete:${getClientIp(request)}`, limit: 40, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

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

  const book = await canManageBook(user.id, user.role, asset.bookId);
  if (!book) {
    return NextResponse.json({ error: "غير مسموح بالوصول لهذا الكتاب." }, { status: 403 });
  }

  const storageService = new BookStorageService();

  await storageService.deleteBookAsset({
    key: asset.storageKey,
    bucket: asset.bucket ?? undefined,
    region: asset.region ?? undefined,
    publicUrl: asset.publicUrl ?? undefined,
  });

  await prisma.$transaction(async (tx) => {
    await tx.bookFile.delete({ where: { id: asset.id } });

    if (asset.kind === FileKind.COVER_IMAGE) {
      await tx.book.update({ where: { id: asset.bookId }, data: { coverImageUrl: null } });
    }
  });

  return NextResponse.json({ message: "تم حذف الملف بنجاح." });
}
