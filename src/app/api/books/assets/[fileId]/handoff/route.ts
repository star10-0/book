import { getCurrentUser } from "@/lib/auth-session";
import { jsonNoStore } from "@/lib/security";
import { getProtectedAssetTokenCookieName, verifyProtectedAssetToken } from "@/lib/security/content-protection";

export const runtime = "nodejs";

type BookAssetHandoffParams = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, { params }: BookAssetHandoffParams) {
  const { fileId } = await params;
  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const user = await getCurrentUser();

  const tokenResult = verifyProtectedAssetToken({
    token: url.searchParams.get("t"),
    fileId,
    disposition,
    currentUserId: user?.id,
  });

  if (!tokenResult.valid) {
    return jsonNoStore({ message: "رابط الوصول للملف غير صالح أو منتهي الصلاحية." }, { status: 403 });
  }

  const targetPath = `/api/books/assets/${encodeURIComponent(fileId)}${disposition === "attachment" ? "?download=1" : ""}`;
  const response = Response.redirect(new URL(targetPath, url.origin), 302);

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.append(
    "Set-Cookie",
    `${getProtectedAssetTokenCookieName()}=${encodeURIComponent(url.searchParams.get("t") ?? "")}; Path=/api; Max-Age=240; HttpOnly; SameSite=Strict; Secure`,
  );

  return response;
}
