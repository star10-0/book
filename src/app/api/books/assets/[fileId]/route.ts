import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { AccessGrantStatus, FileKind, StorageProvider } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { canAccessProtectedAsset, resolveAssetDisposition } from "@/lib/files/protected-asset-policy";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/security";

export const runtime = "nodejs";

type BookAssetRouteParams = {
  params: Promise<{ fileId: string }>;
};

function resolveLocalAssetPath(storageKey: string) {
  const normalized = storageKey.replace(/^\/+/, "");
  const privateRoot = path.resolve(process.cwd(), "storage", "private", "uploads");
  const publicRoot = path.resolve(process.cwd(), "public", "uploads");
  const privatePath = path.resolve(privateRoot, normalized);
  const publicPath = path.resolve(publicRoot, normalized);

  return {
    privatePath: privatePath.startsWith(`${privateRoot}${path.sep}`) || privatePath === privateRoot ? privatePath : null,
    publicPath: publicPath.startsWith(`${publicRoot}${path.sep}`) || publicPath === publicRoot ? publicPath : null,
  };
}

async function resolveReadableLocalPath(storageKey: string) {
  const normalizedCandidates = Array.from(
    new Set([
      storageKey,
      storageKey.replace(/^\/+/, ""),
      storageKey.replace(/^\/?storage\/private\/uploads\/+/, ""),
      storageKey.replace(/^\/?public\/uploads\/+/, ""),
    ]),
  );

  for (const candidate of normalizedCandidates) {
    const { privatePath, publicPath } = resolveLocalAssetPath(candidate);

    if (privatePath) {
      try {
        await access(privatePath);
        return privatePath;
      } catch {}
    }

    if (publicPath) {
      try {
        await access(publicPath);
        return publicPath;
      } catch {}
    }
  }

  return null;
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

export async function GET(request: Request, { params }: BookAssetRouteParams) {
  const { fileId } = await params;
  const url = new URL(request.url);
  const requestedDisposition = resolveAssetDisposition(url.searchParams.get("download") === "1");

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
    return jsonNoStore({ message: "معرّف ملف القراءة غير صالح أو غير موجود." }, { status: 404 });
  }

  const user = await getCurrentUser();
  const now = new Date();
  const canReadWithGrant = user ? await hasActiveAccessGrant(user.id, file.book.id, now) : false;
  const access = canAccessProtectedAsset({
    policy: file.book.contentAccessPolicy,
    hasActiveGrant: canReadWithGrant,
    requestedDisposition,
  });

  if (!access.allowed) {
    return jsonNoStore({ message: "غير مصرح بالوصول لهذا الملف." }, { status: 403 });
  }

  if (file.storageProvider !== StorageProvider.LOCAL) {
    return jsonNoStore({ message: "مزود التخزين الحالي لا يدعم التسليم المحمي بعد." }, { status: 501 });
  }

  const filePath = await resolveReadableLocalPath(file.storageKey);

  if (!filePath) {
    return jsonNoStore(
      {
        message: "سجل الملف موجود لكن الملف الفعلي مفقود من التخزين.",
      },
      { status: 500 },
    );
  }

  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType ?? (file.kind === FileKind.PDF ? "application/pdf" : "application/epub+zip"),
      "Content-Disposition": `${access.disposition}; filename*=UTF-8''${encodeURIComponent(file.originalFileName ?? `${file.id}.${file.kind.toLowerCase()}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
