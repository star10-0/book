import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { resolveAssetDisposition } from "@/lib/files/protected-asset-policy";
import { prisma } from "@/lib/prisma";
import { jsonNoStore } from "@/lib/security";
import {
  createOpaqueHandle,
  getProtectedAssetHandoffTicketCookieName,
  getProtectedAssetSessionAssetsCookieName,
  getProtectedAssetSessionEpubCookieName,
  hashOpaqueHandle,
  resolveOpaqueHandleFromRequest,
} from "@/lib/security/content-protection";

export const runtime = "nodejs";

const ASSET_SESSION_MAX_AGE_SECONDS = 180;

type BookAssetBootstrapParams = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, { params }: BookAssetBootstrapParams) {
  const { fileId } = await params;
  const url = new URL(request.url);
  const disposition = resolveAssetDisposition(url.searchParams.get("download") === "1");
  const user = await getCurrentUser();

  const handoffTicket = resolveOpaqueHandleFromRequest(request, "handoff");
  if (!handoffTicket) {
    return jsonNoStore({ message: "طلب نقل الجلسة غير صالح أو منتهي الصلاحية." }, { status: 401 });
  }

  const handoffTicketHash = hashOpaqueHandle(handoffTicket);
  const now = new Date();

  const redeemed = await prisma.$transaction(async (tx) => {
    const ticket = await tx.protectedAssetHandoffTicket.findUnique({
      where: { tokenHash: handoffTicketHash },
      select: {
        id: true,
        fileId: true,
        disposition: true,
        userId: true,
        accessGrantId: true,
        readingSessionId: true,
        watermarkText: true,
        expiresAt: true,
        redeemedAt: true,
      },
    });

    if (!ticket) {
      return null;
    }

    if (ticket.fileId !== fileId || ticket.disposition !== disposition || ticket.expiresAt <= now || ticket.redeemedAt) {
      return null;
    }

    if (ticket.userId && (!user || ticket.userId !== user.id)) {
      return null;
    }

    const redeemedTicket = await tx.protectedAssetHandoffTicket.updateMany({
      where: {
        id: ticket.id,
        redeemedAt: null,
        expiresAt: { gt: now },
      },
      data: { redeemedAt: now },
    });

    if (redeemedTicket.count !== 1) {
      return null;
    }

    const assetSessionHandle = createOpaqueHandle();
    await tx.protectedAssetSession.create({
      data: {
        tokenHash: hashOpaqueHandle(assetSessionHandle),
        fileId: ticket.fileId,
        disposition: ticket.disposition,
        userId: ticket.userId,
        accessGrantId: ticket.accessGrantId,
        readingSessionId: ticket.readingSessionId,
        watermarkText: ticket.watermarkText,
        expiresAt: new Date(Date.now() + ASSET_SESSION_MAX_AGE_SECONDS * 1000),
      },
    });

    return { assetSessionHandle };
  });

  if (!redeemed?.assetSessionHandle) {
    return jsonNoStore({ message: "طلب نقل الجلسة غير صالح أو منتهي الصلاحية." }, { status: 403 });
  }

  const targetPath = `/api/books/assets/${encodeURIComponent(fileId)}${disposition === "attachment" ? "?download=1" : ""}`;
  const response = NextResponse.redirect(new URL(targetPath, url.origin), 302);

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  response.cookies.set(getProtectedAssetHandoffTicketCookieName(), "", {
    path: `/api/books/assets/${encodeURIComponent(fileId)}/bootstrap`,
    maxAge: 0,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  response.cookies.set(getProtectedAssetSessionAssetsCookieName(), redeemed.assetSessionHandle, {
    path: "/api/books/assets",
    maxAge: ASSET_SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  response.cookies.set(getProtectedAssetSessionEpubCookieName(), redeemed.assetSessionHandle, {
    path: "/api/reader-epub",
    maxAge: ASSET_SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
