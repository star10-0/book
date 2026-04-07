import { getCurrentUser } from "@/lib/auth-session";
import { jsonNoStore } from "@/lib/security";
import {
  getProtectedAssetNonceCookieName,
  getProtectedAssetTokenCookieName,
  resolveProtectedAssetToken,
  verifyProtectedAssetToken,
} from "@/lib/security/content-protection";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

type TokenFailureReason =
  | "MISSING_TOKEN"
  | "MALFORMED_TOKEN"
  | "SIGNING_SECRET_UNSET"
  | "INVALID_SIGNATURE"
  | "MISMATCH"
  | "TOKEN_EXPIRED"
  | "WRONG_USER"
  | "NONCE_MISMATCH"
  | "SESSION_MISMATCH"
  | "INVALID_PAYLOAD";

function mapTokenFailure(reason: TokenFailureReason) {
  switch (reason) {
    case "MISSING_TOKEN":
      return { status: 401, message: "رمز الوصول مفقود." };
    case "TOKEN_EXPIRED":
      return { status: 401, message: "انتهت صلاحية رمز الوصول." };
    case "SIGNING_SECRET_UNSET":
      return { status: 500, message: "إعدادات الأمان غير مكتملة على الخادم." };
    case "INVALID_SIGNATURE":
    case "MALFORMED_TOKEN":
    case "INVALID_PAYLOAD":
    case "MISMATCH":
    case "WRONG_USER":
    case "NONCE_MISMATCH":
    case "SESSION_MISMATCH":
      return { status: 403, message: "رمز الوصول غير صالح." };
  }
}

type BookAssetHandoffParams = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, { params }: BookAssetHandoffParams) {
  try {
    const { fileId } = await params;
    const url = new URL(request.url);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
    const user = await getCurrentUser();
    const token = resolveProtectedAssetToken(request, url, { allowQueryToken: true });

    const tokenResult = verifyProtectedAssetToken({
      token,
      fileId,
      disposition,
      currentUserId: user?.id,
    });

    if (!tokenResult.valid) {
      const mapped = mapTokenFailure(tokenResult.reason);
      if (isDev) {
        console.error("[assets/handoff] token verification failed", {
          fileId,
          reason: tokenResult.reason,
          hasToken: Boolean(token),
          hasUser: Boolean(user?.id),
        });
      }
      return jsonNoStore({ message: mapped.message, code: tokenResult.reason }, { status: mapped.status });
    }

    const targetPath = `/api/books/assets/${encodeURIComponent(fileId)}${disposition === "attachment" ? "?download=1" : ""}`;
    const response = Response.redirect(new URL(targetPath, url.origin), 302);

    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.append(
      "Set-Cookie",
      `${getProtectedAssetTokenCookieName()}=${encodeURIComponent(token ?? "")}; Path=/api; Max-Age=90; HttpOnly; SameSite=Strict; Secure`,
    );
    response.headers.append(
      "Set-Cookie",
      `${getProtectedAssetNonceCookieName()}=${encodeURIComponent(tokenResult.payload.jti)}; Path=/api; Max-Age=90; HttpOnly; SameSite=Strict; Secure`,
    );
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

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
