import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/auth-demo-user";
import { prisma } from "@/lib/prisma";

type UpdateReadingProgressBody = {
  progressPercent?: number;
  locator?: string;
};

function normalizeProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

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
  const { accessId } = await context.params;
  const demoUser = await getOrCreateDemoUser();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "تعذر قراءة بيانات التقدم." }, { status: 400 });
  }

  const validation = validatePayload(body);

  if (!validation.data) {
    return NextResponse.json({ message: validation.error ?? "بيانات التقدم غير صالحة." }, { status: 400 });
  }

  const accessGrant = await prisma.accessGrant.findFirst({
    where: {
      id: accessId,
      userId: demoUser.id,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      bookId: true,
    },
  });

  if (!accessGrant) {
    return NextResponse.json({ message: "الوصول غير متاح أو منتهي الصلاحية." }, { status: 403 });
  }

  const now = new Date();
  const completedAt = validation.data.progressPercent >= 100 ? now : null;

  const progress = await prisma.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId: demoUser.id,
        bookId: accessGrant.bookId,
      },
    },
    create: {
      userId: demoUser.id,
      bookId: accessGrant.bookId,
      progressPercent: validation.data.progressPercent,
      locator: validation.data.locator,
      lastOpenedAt: now,
      completedAt,
    },
    update: {
      progressPercent: validation.data.progressPercent,
      locator: validation.data.locator,
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

  return NextResponse.json({
    message: "تم تحديث تقدم القراءة.",
    progress,
  });
}
