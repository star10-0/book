import { NextResponse } from "next/server";
import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { getClientIp } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma";
import { normalizeProgress } from "@/lib/reader/locator";
import { closeReadingSession, resolveReaderSessionAccess, touchReadingSession } from "@/lib/reader-session";
import { enforceRateLimit, isSameOriginMutation, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

type UpdateReadingProgressBody = {
  progressPercent?: number;
  locator?: string;
};


function validatePayload(payload: unknown): { data?: { progressPercent: number; locator: string | null }; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "بيانات التقدم غير صالحة." };
  }

  const { progressPercent, locator } = payload as UpdateReadingProgressBody;

  if (typeof progressPercent !== "number" || Number.isNaN(progressPercent)) {
    return { error: "حقل progressPercent مطلوب ويجب أن يكون رقمياً." };
  }

  if (typeof locator !== "string" && typeof locator !== "undefined") {
    return { error: "حقل locator يجب أن يكون نصاً." };
  }

  return {
    data: {
      progressPercent: normalizeProgress(progressPercent),
      locator: locator?.trim() ? locator.trim() : null,
    },
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ accessId: string }> }) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `reading-progress:update:${getClientIp(request)}`, limit: 120, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const { accessId } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const parsedBody = await parseJsonBody<unknown>(request, { invalidMessage: "تعذر قراءة بيانات التقدم." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const validation = validatePayload(body);

  if (!validation.data) {
    return jsonError(API_ERROR_CODES.invalid_request, validation.error ?? "بيانات التقدم غير صالحة.", 400);
  }
  const validatedData = validation.data;

  const now = new Date();
  const accessGrant = await prisma.accessGrant.findFirst({
    where: { id: accessId, userId: user.id },
    select: { bookId: true },
  });
  if (!accessGrant) {
    return jsonError(API_ERROR_CODES.forbidden, "الوصول غير متاح أو منتهي الصلاحية.", 403);
  }

  const sessionAccess = await prisma.$transaction((tx) =>
    resolveReaderSessionAccess(tx, { accessGrantId: accessId, userId: user.id, now }),
  );
  if (!sessionAccess.allowed) {
    await prisma.$transaction((tx) =>
      closeReadingSession(tx, {
        accessGrantId: accessId,
        userId: user.id,
        now,
        locator: validatedData.locator,
      }),
    );
    return jsonError(API_ERROR_CODES.forbidden, "الوصول غير متاح أو منتهي الصلاحية.", 403);
  }

  const completedAt = validatedData.progressPercent >= 100 ? now : null;

  const progress = await prisma.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId: user.id,
        bookId: accessGrant.bookId,
      },
    },
    create: {
      userId: user.id,
      bookId: accessGrant.bookId,
      progressPercent: validatedData.progressPercent,
      locator: validatedData.locator,
      lastOpenedAt: now,
      completedAt,
    },
    update: {
      progressPercent: validatedData.progressPercent,
      locator: validatedData.locator,
      lastOpenedAt: now,
      completedAt,
    },
    select: {
      progressPercent: true,
      locator: true,
      completedAt: true,
      updatedAt: true,
    },
  });

  await prisma.$transaction((tx) =>
    touchReadingSession(tx, {
      accessGrantId: accessId,
      userId: user.id,
      now,
      locator: validatedData.locator,
    }),
  );

  return NextResponse.json({
    message: "تم تحديث تقدم القراءة.",
    progress,
  });
}
