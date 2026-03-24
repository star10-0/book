import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { AccessGrantStatus, ContentAccessPolicy, FileKind, StorageProvider } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/security";

export const runtime = "nodejs";

type BookAssetRouteParams = {
  params: Promise<{ fileId: string }>;
};

function resolveLocalAssetPath(storageKey: string) {
  const privatePath = path.join(process.cwd(), "storage", "private", "uploads", storageKey);
  const publicPath = path.join(process.cwd(), "public", "uploads", storageKey);

  return { privatePath, publicPath };
}

async function resolveReadableLocalPath(storageKey: string) {
  const { privatePath, publicPath } = resolveLocalAssetPath(storageKey);

  try {
    await access(privatePath);
    return privatePath;
  } catch {
    try {
      await access(publicPath);
      return publicPath;
    } catch {
      return null;
    }
  }
}

function userCanReadByPolicy(policy: ContentAccessPolicy) {
  return policy === ContentAccessPolicy.PUBLIC_READ || policy === ContentAccessPolicy.PUBLIC_DOWNLOAD;
}

async function hasActiveAccessGrant(userId: string, bookId: string, now: Date) {
  const grant = await prisma.accessGrant.findFirst({
    where: {
      userId,
      bookId,
      status: AccessGrantStatus.ACTIVE,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });

  return Boolean(grant);
}

export async function GET(_request: Request, { params }: BookAssetRouteParams) {
  const { fileId } = await params;

  const file = await prisma.bookFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      kind: true,
      storageProvider: true,
      storageKey: true,
      mimeType: true,
      originalFileName: true,
      book: {
        select: {
          id: true,
          contentAccessPolicy: true,
        },
      },
    },
  });

  if (!file || (file.kind !== FileKind.PDF && file.kind !== FileKind.EPUB)) {
    return jsonNoStore({ message: "الملف المطلوب غير متاح." }, { status: 404 });
  }

  const user = await getCurrentUser();
  const now = new Date();

  const canReadPublic = userCanReadByPolicy(file.book.contentAccessPolicy);
  const canReadWithGrant = user ? await hasActiveAccessGrant(user.id, file.book.id, now) : false;

  if (!canReadPublic && !canReadWithGrant) {
    return jsonNoStore({ message: "غير مصرح بالوصول لهذا الملف." }, { status: 403 });
  }

  if (file.storageProvider !== StorageProvider.LOCAL) {
    return jsonNoStore({ message: "مزود التخزين الحالي لا يدعم التسليم المحمي بعد." }, { status: 501 });
  }

  const filePath = await resolveReadableLocalPath(file.storageKey);

  if (!filePath) {
    return jsonNoStore({ message: "تعذر العثور على الملف." }, { status: 404 });
  }

  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType ?? (file.kind === FileKind.PDF ? "application/pdf" : "application/epub+zip"),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.originalFileName ?? `${file.id}.${file.kind.toLowerCase()}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
