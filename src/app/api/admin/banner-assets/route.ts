import { FileKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminScope } from "@/lib/auth-session";
import { createStorageProvider } from "@/lib/files/storage-provider";
import { getUploadValidationArabicMessage, validateUploadPayload } from "@/lib/files/upload-validation";
import { readOptionalServerEnv } from "@/lib/env";
import { getClientIp } from "@/lib/observability/logger";
import { enforceRateLimit, isSameOriginMutation, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAdminScope("CONTENT_ADMIN");

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `admin:banner-assets:upload:${getClientIp(request)}`, limit: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ملف الصورة مطلوب." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateUploadPayload({
    kind: FileKind.COVER_IMAGE,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    bytes,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: getUploadValidationArabicMessage(validation.code, validation.maxBytes) }, { status: 400 });
  }

  const provider = createStorageProvider((readOptionalServerEnv("BOOK_STORAGE_PROVIDER") || "local") as "local" | "s3" | "r2");
  const uploaded = await provider.uploadFile({
    bytes,
    fileName: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type,
    folder: "banners/storefront",
    visibility: "public",
  });

  return NextResponse.json({
    url: uploaded.publicUrl,
    message: "تم رفع صورة البانر بنجاح.",
  });
}
