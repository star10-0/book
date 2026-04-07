import { NextResponse } from "next/server";
import { API_ERROR_CODES, jsonError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { resolveReaderSessionAccess } from "@/lib/reader-session";

export async function GET(_: Request, context: { params: Promise<{ accessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const { accessId } = await context.params;
  const now = new Date();
  const access = await prisma.$transaction((tx) =>
    resolveReaderSessionAccess(tx, {
      accessGrantId: accessId,
      userId: user.id,
      now,
    }),
  );

  if (!access.allowed) {
    return NextResponse.json({ mode: "EXPIRED" as const }, { status: 403 });
  }

  if (access.mode === "GRACE") {
    return NextResponse.json({
      mode: "GRACE" as const,
      graceEndsAt: access.graceEndsAt.toISOString(),
    });
  }

  return NextResponse.json({ mode: "ACTIVE" as const });
}
