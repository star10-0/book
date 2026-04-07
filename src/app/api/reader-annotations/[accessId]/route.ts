import { NextResponse } from "next/server";
import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { getClientIp } from "@/lib/observability/logger";
import { prisma } from "@/lib/prisma";
import { resolveReaderSessionAccess, touchReadingSession } from "@/lib/reader-session";
import { enforceRateLimit, isSameOriginMutation, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

type AnnotationBody = {
  type?: "DRAWING" | "NOTE" | "BOOKMARK";
  locator?: string;
  payload?: unknown;
};
type AnnotationUpdateBody = {
  id?: string;
  payload?: unknown;
};

function sanitizePayload(type: "DRAWING" | "NOTE" | "BOOKMARK", payload: unknown) {
  if (type === "NOTE") {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const text = typeof (payload as { text?: unknown }).text === "string" ? (payload as { text: string }).text.trim() : "";

    if (!text) {
      return null;
    }

    return { text: text.slice(0, 1200) };
  }

  if (type === "BOOKMARK") {
    const label = payload && typeof payload === "object" && typeof (payload as { label?: unknown }).label === "string"
      ? (payload as { label: string }).label.trim().slice(0, 120)
      : "";

    return {
      label,
    };
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const strokes = Array.isArray((payload as { strokes?: unknown }).strokes) ? (payload as { strokes: unknown[] }).strokes : [];
  const safeStrokes = strokes
    .map((stroke) => {
      if (!stroke || typeof stroke !== "object") {
        return null;
      }

      const color = typeof (stroke as { color?: unknown }).color === "string" ? (stroke as { color: string }).color : "#2563eb";
      const width = typeof (stroke as { width?: unknown }).width === "number" ? (stroke as { width: number }).width : 2;
      const points = Array.isArray((stroke as { points?: unknown }).points) ? (stroke as { points: unknown[] }).points : [];

      const safePoints = points
        .map((point) => {
          if (!Array.isArray(point) || point.length !== 2) {
            return null;
          }

          const [x, y] = point;
          if (typeof x !== "number" || Number.isNaN(x) || typeof y !== "number" || Number.isNaN(y)) {
            return null;
          }

          return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
        })
        .filter((point): point is [number, number] => point !== null);

      if (!safePoints.length) {
        return null;
      }

      return {
        color: color.slice(0, 20),
        width: Math.min(12, Math.max(1, width)),
        points: safePoints,
      };
    })
    .filter((stroke): stroke is { color: string; width: number; points: [number, number][] } => stroke !== null)
    .slice(0, 80);

  return {
    strokes: safeStrokes,
  };
}

async function getAuthorizedBookId(accessId: string, userId: string) {
  const now = new Date();
  const accessGrant = await prisma.accessGrant.findFirst({ where: { id: accessId, userId }, select: { bookId: true } });
  if (!accessGrant) {
    return null;
  }

  const access = await prisma.$transaction((tx) => resolveReaderSessionAccess(tx, { accessGrantId: accessId, userId, now }));
  if (!access.allowed) {
    return null;
  }

  await prisma.$transaction((tx) =>
    touchReadingSession(tx, {
      accessGrantId: accessId,
      userId,
      now,
    }),
  );

  return accessGrant?.bookId ?? null;
}

export async function GET(_: Request, context: { params: Promise<{ accessId: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const { accessId } = await context.params;
  const bookId = await getAuthorizedBookId(accessId, user.id);

  if (!bookId) {
    return jsonError(API_ERROR_CODES.forbidden, "الوصول غير متاح أو منتهي الصلاحية.", 403);
  }

  try {
    const annotations = await prisma.readerAnnotation.findMany({
      where: {
        userId: user.id,
        bookId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        type: true,
        locator: true,
        payload: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ annotations });
  } catch {
    return jsonError(API_ERROR_CODES.server_error, "تعذر تحميل الملاحظات حالياً. حاول مرة أخرى.", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ accessId: string }> }) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `reader-annotations:create:${getClientIp(request)}`, limit: 120, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const parsedBody = await parseJsonBody<unknown>(request, { invalidMessage: "تعذر قراءة بيانات التعليق." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }

  const body = parsedBody.data as AnnotationBody;
  const type = body.type;
  const locator = typeof body.locator === "string" ? body.locator.trim().slice(0, 120) : "";

  if (!type || !["DRAWING", "NOTE", "BOOKMARK"].includes(type)) {
    return jsonError(API_ERROR_CODES.invalid_request, "نوع التعليق غير صالح.", 400);
  }

  if (!locator) {
    return jsonError(API_ERROR_CODES.invalid_request, "الموضع مطلوب.", 400);
  }

  const sanitizedPayload = sanitizePayload(type, body.payload);
  if (!sanitizedPayload) {
    return jsonError(API_ERROR_CODES.invalid_request, "بيانات التعليق غير صالحة.", 400);
  }

  const { accessId } = await context.params;
  const bookId = await getAuthorizedBookId(accessId, user.id);

  if (!bookId) {
    return jsonError(API_ERROR_CODES.forbidden, "الوصول غير متاح أو منتهي الصلاحية.", 403);
  }

  try {
    const annotation = await (
      type === "NOTE"
        ? prisma.readerAnnotation.create({
            data: {
              userId: user.id,
              bookId,
              type,
              locator,
              payload: sanitizedPayload,
            },
            select: {
              id: true,
              type: true,
              locator: true,
              payload: true,
              updatedAt: true,
              createdAt: true,
            },
          })
        : prisma.$transaction(async (tx) => {
            const existing = await tx.readerAnnotation.findFirst({
              where: {
                userId: user.id,
                bookId,
                type,
                locator,
              },
              orderBy: {
                updatedAt: "desc",
              },
              select: {
                id: true,
              },
            });

            if (existing) {
              return tx.readerAnnotation.update({
                where: {
                  id: existing.id,
                },
                data: {
                  payload: sanitizedPayload,
                },
                select: {
                  id: true,
                  type: true,
                  locator: true,
                  payload: true,
                  updatedAt: true,
                  createdAt: true,
                },
              });
            }

            return tx.readerAnnotation.create({
              data: {
                userId: user.id,
                bookId,
                type,
                locator,
                payload: sanitizedPayload,
              },
              select: {
                id: true,
                type: true,
                locator: true,
                payload: true,
                updatedAt: true,
                createdAt: true,
              },
            });
          })
    );

    return NextResponse.json({ annotation }, { status: 201 });
  } catch {
    return jsonError(API_ERROR_CODES.server_error, "تعذر حفظ التعليق حالياً. حاول مرة أخرى.", 500);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ accessId: string }> }) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `reader-annotations:delete:${getClientIp(request)}`, limit: 120, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const { accessId } = await context.params;
  const bookId = await getAuthorizedBookId(accessId, user.id);

  if (!bookId) {
    return jsonError(API_ERROR_CODES.forbidden, "الوصول غير متاح أو منتهي الصلاحية.", 403);
  }

  const annotationId = new URL(request.url).searchParams.get("id")?.trim();
  if (!annotationId) {
    return jsonError(API_ERROR_CODES.invalid_request, "معرف التعليق مطلوب.", 400);
  }

  let deleted;
  try {
    deleted = await prisma.readerAnnotation.deleteMany({
      where: {
        id: annotationId,
        userId: user.id,
        bookId,
      },
    });
  } catch {
    return jsonError(API_ERROR_CODES.server_error, "تعذر حذف التعليق حالياً. حاول مرة أخرى.", 500);
  }

  if (!deleted.count) {
    return jsonError(API_ERROR_CODES.not_found, "لم يتم العثور على التعليق.", 404);
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ accessId: string }> }) {
  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `reader-annotations:update:${getClientIp(request)}`, limit: 120, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const user = await getCurrentUser();
  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const parsedBody = await parseJsonBody<unknown>(request, { invalidMessage: "تعذر قراءة بيانات التعليق." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }

  const body = parsedBody.data as AnnotationUpdateBody;
  const annotationId = typeof body.id === "string" ? body.id.trim() : "";
  if (!annotationId) {
    return jsonError(API_ERROR_CODES.invalid_request, "معرف التعليق مطلوب.", 400);
  }

  const { accessId } = await context.params;
  const bookId = await getAuthorizedBookId(accessId, user.id);
  if (!bookId) {
    return jsonError(API_ERROR_CODES.forbidden, "الوصول غير متاح أو منتهي الصلاحية.", 403);
  }

  try {
    const existing = await prisma.readerAnnotation.findFirst({
        where: {
          id: annotationId,
          userId: user.id,
          bookId,
        },
        select: {
          id: true,
          type: true,
        },
      });

    if (!existing) {
      return jsonError(API_ERROR_CODES.not_found, "لم يتم العثور على التعليق.", 404);
    }

    if (existing.type !== "NOTE") {
      return jsonError(API_ERROR_CODES.invalid_request, "التعديل مدعوم للملاحظات فقط.", 400);
    }

    const sanitizedPayload = sanitizePayload("NOTE", body.payload);
    if (!sanitizedPayload) {
      return jsonError(API_ERROR_CODES.invalid_request, "بيانات التعليق غير صالحة.", 400);
    }

    const annotation = await prisma.readerAnnotation.update({
      where: { id: existing.id },
      data: { payload: sanitizedPayload },
      select: {
        id: true,
        type: true,
        locator: true,
        payload: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ annotation });
  } catch {
    return jsonError(API_ERROR_CODES.server_error, "تعذر تحديث الملاحظة حالياً. حاول مرة أخرى.", 500);
  }
}
