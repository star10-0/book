import { FileKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { canReadPubliclyByPolicy, resolveAssetDisposition } from "@/lib/files/protected-asset-policy";
import { prisma } from "@/lib/prisma";
import { resolveReaderSessionAccess } from "@/lib/reader-session";
import { jsonNoStore } from "@/lib/security";
import {
  buildWatermarkText,
  createOpaqueHandle,
  getProtectedAssetHandoffTicketCookieName,
  hashOpaqueHandle,
} from "@/lib/security/content-protection";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

const HANDOFF_TICKET_MAX_AGE_SECONDS = 45;

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

    let accessGrantId: string | null = null;
    let readingSessionId: string | null = null;
    let orderId: string | null = null;
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
          orderId = grant.orderItem?.orderId ?? null;
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
            orderId = grant.orderItem?.orderId ?? null;
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

    const handoffTicket = createOpaqueHandle();
    const handoffTicketHash = hashOpaqueHandle(handoffTicket);
    const expiresAt = new Date(Date.now() + HANDOFF_TICKET_MAX_AGE_SECONDS * 1000);

    await prisma.protectedAssetHandoffTicket.create({
      data: {
        tokenHash: handoffTicketHash,
        fileId,
        disposition,
        userId: user?.id ?? null,
        accessGrantId,
        readingSessionId,
        watermarkText,
        expiresAt,
      },
    });

    const targetPath = `/api/books/assets/${encodeURIComponent(fileId)}/bootstrap${disposition === "attachment" ? "?download=1" : ""}`;
    const response = NextResponse.redirect(new URL(targetPath, url.origin), 302);

    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.cookies.set(getProtectedAssetHandoffTicketCookieName(), handoffTicket, {
      path: `/api/books/assets/${encodeURIComponent(fileId)}/bootstrap`,
      maxAge: HANDOFF_TICKET_MAX_AGE_SECONDS,
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
