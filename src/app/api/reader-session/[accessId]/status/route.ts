import { API_ERROR_CODES, jsonError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { resolveReaderSessionAccess } from "@/lib/reader-session";
import { resolveReaderSessionStatusPayload } from "@/lib/reader-session-status";
import { jsonNoStore } from "@/lib/security";

export async function GET(request: Request, context: { params: Promise<{ accessId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  const { accessId } = await context.params;
  const sid = new URL(request.url).searchParams.get("sid")?.trim() || undefined;
  const now = new Date();
  const access = await prisma.$transaction((tx) =>
    resolveReaderSessionAccess(tx, {
      accessGrantId: accessId,
      userId: user.id,
      now,
      requiredSessionId: sid,
    }),
  );

  const status = resolveReaderSessionStatusPayload({ access, sidProvided: Boolean(sid) });
  return jsonNoStore(status.body, { status: status.status });
}
