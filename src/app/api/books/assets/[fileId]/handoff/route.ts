import { FileKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { canReadPubliclyByPolicy, resolveAssetDisposition } from "@/lib/files/protected-asset-policy";
import { prisma } from "@/lib/prisma";
import { resolveReaderSessionAccess } from "@/lib/reader-session";
import { jsonNoStore } from "@/lib/security";
import {
  buildWatermarkText,
  createProtectedAssetToken,
  getProtectedAssetNonceCookieName,
  getProtectedAssetTokenCookieName,
  verifyProtectedAssetToken,
} from "@/lib/security/content-protection";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

type BookAssetHandoffParams = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, { params }: BookAssetHandoffParams) {
  try {
    const { fileId } = await params;
    const url = new URL(request.url);
    const disposition = resolveAssetDisposition(url.searchParams.get("download") === "1");
    const user = await getCurrentUser();
    const file = await prisma.bookFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        kind: true,
        bookId: true,
        book: { select: { contentAccessPolicy: true } },
      },
    });

    if (!file || (file.kind !== FileKind.PDF && file.kind !== FileKind.EPUB)) {
      return jsonNoStore({ message: "معرّف ملف القراءة غير صالح أو غير موجود." }, { status: 404 });
    }

    const isPubliclyReadable = canReadPubliclyByPolicy(file.book.contentAccessPolicy);
    if (!isPubliclyReadable && !user) {
      return jsonNoStore({ message: "يلزم تسجيل الدخول للوصول إلى هذا الملف." }, { status: 401 });
    }

    let accessGrantId: string | undefined;
    let readingSessionId: string | undefined;
    let orderId: string | undefined;
    const now = new Date();

    if (!isPubliclyReadable && user) {
      const grants = await prisma.accessGrant.findMany({
        where: {
          userId: user.id,
          bookId: file.bookId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          expiresAt: true,
          orderItem: { select: { orderId: true } },
        },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
      });

      for (const grant of grants) {
        const accessState = await prisma.$transaction((tx) =>
          resolveReaderSessionAccess(tx, { accessGrantId: grant.id, userId: user.id, now }),
        );

        if (accessState.allowed && accessState.mode === "ACTIVE") {
          accessGrantId = grant.id;
          orderId = grant.orderItem?.orderId ?? undefined;
          break;
        }

        if (accessState.allowed && accessState.mode === "GRACE") {
          const session = await prisma.readingSession.findFirst({
            where: {
              accessGrantId: grant.id,
              userId: user.id,
              closedAt: null,
            },
            select: { id: true },
            orderBy: { openedAt: "asc" },
          });

          if (!session) {
            continue;
          }

          const graceState = await prisma.$transaction((tx) =>
            resolveReaderSessionAccess(tx, {
              accessGrantId: grant.id,
              userId: user.id,
              now,
              requiredSessionId: session.id,
            }),
          );

          if (graceState.allowed) {
            accessGrantId = grant.id;
            readingSessionId = session.id;
            orderId = grant.orderItem?.orderId ?? undefined;
            break;
          }
        }
      }

      if (!accessGrantId) {
        return jsonNoStore({ message: "رابط الوصول للملف غير صالح أو منتهي الصلاحية." }, { status: 403 });
      }
    }

    const watermarkText = buildWatermarkText({
      email: user?.email,
      userId: user?.id,
      accessGrantId,
      orderId,
    });

    const token = createProtectedAssetToken({
      fileId,
      disposition,
      userId: user?.id,
      accessGrantId,
      readingSessionId,
      watermarkText: watermarkText ?? undefined,
    });
    const verifiedToken = verifyProtectedAssetToken({
      token,
      fileId,
      disposition,
      currentUserId: user?.id,
    });
    if (!verifiedToken.valid) {
      return jsonNoStore({ message: "تعذر إنشاء رمز الوصول للملف." }, { status: 500 });
    }

    const targetPath = `/api/books/assets/${encodeURIComponent(fileId)}${disposition === "attachment" ? "?download=1" : ""}`;
    const response = NextResponse.redirect(new URL(targetPath, url.origin), 302);

    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.cookies.set(getProtectedAssetTokenCookieName(), token, {
      path: "/api",
      maxAge: 90,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set(getProtectedAssetNonceCookieName(), verifiedToken.payload.jti, {
      path: "/api",
      maxAge: 90,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    if (isDev) {
      console.error("[assets/handoff] unexpected failure", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return jsonNoStore({ message: "تعذر تجهيز تحويل الوصول للملف." }, { status: 500 });
  }
}
