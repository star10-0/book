import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { FileKind, StorageProvider } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { mapStorageProviderEnumToKey } from "@/lib/files/book-storage-service";
import { canAccessProtectedAsset, canReadPubliclyByPolicy, resolveAssetDisposition } from "@/lib/files/protected-asset-policy";
import { createStorageProvider } from "@/lib/files/storage-provider";
import { prisma } from "@/lib/prisma";
import { resolveReaderSessionAccess, touchReadingSession } from "@/lib/reader-session";
import { jsonNoStore } from "@/lib/security";
import {
  buildWatermarkText,
  resolveProtectedAssetNonce,
  resolveProtectedAssetToken,
  verifyProtectedAssetToken,
} from "@/lib/security/content-protection";
import { logUserSecurityEvent } from "@/lib/security/suspicious-activity";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

type TokenFailureReason =
  | "MISSING_TOKEN"
  | "MALFORMED_TOKEN"
  | "SIGNING_SECRET_UNSET"
  | "INVALID_SIGNATURE"
  | "MISMATCH"
  | "TOKEN_EXPIRED"
  | "WRONG_USER"
  | "NONCE_MISMATCH"
  | "SESSION_MISMATCH"
  | "INVALID_PAYLOAD";

function mapTokenFailure(reason: TokenFailureReason) {
  switch (reason) {
    case "MISSING_TOKEN":
      return { status: 401, message: "رمز الوصول مفقود." };
    case "TOKEN_EXPIRED":
      return { status: 401, message: "انتهت صلاحية رمز الوصول." };
    case "SIGNING_SECRET_UNSET":
      return { status: 500, message: "إعدادات الأمان غير مكتملة على الخادم." };
    case "INVALID_SIGNATURE":
    case "MALFORMED_TOKEN":
    case "INVALID_PAYLOAD":
    case "MISMATCH":
    case "WRONG_USER":
    case "NONCE_MISMATCH":
    case "SESSION_MISMATCH":
      return { status: 403, message: "رمز الوصول غير صالح." };
  }
}

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
      bucket: true,
      region: true,
      publicUrl: true,
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
  const isPubliclyReadable = canReadPubliclyByPolicy(file.book.contentAccessPolicy);
  let accessGrantId: string | null = null;
  let readingSessionId: string | null = null;
  let canReadWithGrant = false;
  let activeGrant: { id: string; orderItem: { orderId: string } | null } | null = null;

  if (!isPubliclyReadable) {
    const resolvedToken = resolveProtectedAssetToken(request);
    const handoffNonce = resolveProtectedAssetNonce(request);
    const tokenResult = verifyProtectedAssetToken({
      token: resolvedToken,
      fileId,
      disposition: requestedDisposition,
      currentUserId: user?.id,
      expectedNonce: resolvedToken && !request.headers.get("authorization") ? handoffNonce : undefined,
    });

    if (!tokenResult.valid) {
      const mapped = mapTokenFailure(tokenResult.reason);
      if (isDev) {
        console.error("[assets/file] token verification failed", {
          fileId,
          reason: tokenResult.reason,
          hasResolvedToken: Boolean(resolvedToken),
          hasNonceCookie: Boolean(handoffNonce),
          hasUser: Boolean(user?.id),
        });
      }
      if (user) {
        await logUserSecurityEvent({
          userId: user.id,
          type: "CONTENT_ACCESS_TOKEN_INVALID",
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
          metadata: {
            fileId,
            reason: tokenResult.reason,
            disposition: requestedDisposition,
          },
        });
      }

      return jsonNoStore({ message: mapped.message, code: tokenResult.reason }, { status: mapped.status });
    }

    accessGrantId = tokenResult.payload.aid ?? null;
    readingSessionId = tokenResult.payload.sid ?? null;
    if (!user || !accessGrantId) {
      return jsonNoStore({ message: "رابط الوصول للملف غير صالح أو منتهي الصلاحية." }, { status: 403 });
    }

    const resolvedGrantId = accessGrantId;
    const accessState = await prisma.$transaction((tx) =>
      resolveReaderSessionAccess(tx, {
        accessGrantId: resolvedGrantId,
        userId: user.id,
        now,
      }),
    );
    canReadWithGrant = accessState.allowed;

    if (accessState.allowed && accessState.mode === "GRACE" && !readingSessionId) {
      canReadWithGrant = false;
    }
    if (accessState.allowed && accessState.mode === "GRACE" && readingSessionId) {
      const session = await prisma.readingSession.findFirst({
        where: {
          id: readingSessionId,
          accessGrantId: resolvedGrantId,
          userId: user.id,
          closedAt: null,
        },
        select: { id: true },
      });
      if (!session) {
        canReadWithGrant = false;
      }
    }

    if (canReadWithGrant) {
      await prisma.$transaction((tx) =>
        touchReadingSession(tx, {
          accessGrantId: resolvedGrantId,
          userId: user.id,
          now,
        }),
      );
      activeGrant = await prisma.accessGrant.findFirst({
        where: { id: resolvedGrantId, userId: user.id },
        select: { id: true, orderItem: { select: { orderId: true } } },
      });
    }
  }

  const access = canAccessProtectedAsset({
    policy: file.book.contentAccessPolicy,
    hasActiveGrant: canReadWithGrant,
    requestedDisposition,
  });

  if (!access.allowed) {
    if (user && !canReadWithGrant && !isPubliclyReadable) {
      await logUserSecurityEvent({
        userId: user.id,
        type: "CONTENT_ACCESS_REPLAY_AFTER_REVOCATION",
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          fileId,
          reason: access.reason,
        },
      });
    }

    return jsonNoStore({ message: "غير مصرح بالوصول لهذا الملف." }, { status: 403 });
  }

  const watermark = buildWatermarkText({
    email: user?.email,
    userId: user?.id,
    accessGrantId: activeGrant?.id,
    orderId: activeGrant?.orderItem?.orderId,
  });

  if (file.storageProvider !== StorageProvider.LOCAL) {
    try {
      const provider = createStorageProvider(mapStorageProviderEnumToKey(file.storageProvider));
      const signedUrl = await provider.createSignedAssetUrl({
        pointer: {
          key: file.storageKey,
          bucket: file.bucket ?? undefined,
          region: file.region ?? undefined,
          publicUrl: file.publicUrl ?? undefined,
        },
        fileName: file.originalFileName ?? `${file.id}.${file.kind.toLowerCase()}`,
        disposition: access.disposition,
        mimeType: file.mimeType,
      });

      if (!signedUrl) {
        return jsonNoStore({ message: "تعذر إنشاء رابط الوصول للملف." }, { status: 500 });
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: signedUrl,
          "Cache-Control": "private, no-store",
          "X-Book-Watermark-Hook": watermark ?? "",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          "Cross-Origin-Resource-Policy": "same-origin",
        },
      });
    } catch (error) {
      if (isDev) {
        console.error("[assets/file] failed to create signed asset URL", {
          fileId,
          provider: file.storageProvider,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return jsonNoStore({ message: "تعذر تجهيز الملف للقراءة حالياً." }, { status: 500 });
    }
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
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Book-Watermark-Hook": watermark ?? "",
    },
  });
}
