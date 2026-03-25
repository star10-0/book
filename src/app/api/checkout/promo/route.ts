import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { applyPromoCodeToOrder, PromoError } from "@/lib/promos";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

interface ApplyPromoBody {
  orderId?: string;
  code?: string;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  const clientIp = request.headers.get("x-forwarded-for") ?? "local";
  const rateLimit = enforceRateLimit({ key: `checkout:promo:${clientIp}`, limit: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) return rejectRateLimited(rateLimit.retryAfterSeconds);

  const user = await getCurrentUser();
  if (!user) return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);

  const parsedBody = await parseJsonBody<ApplyPromoBody>(request, { invalidMessage: "تعذر قراءة بيانات رمز الخصم." });
  if ("error" in parsedBody) return parsedBody.error;

  const orderId = parsedBody.data.orderId?.trim();
  const code = parsedBody.data.code?.trim();
  if (!orderId || !code) {
    return jsonNoStore({ message: "يجب إدخال رمز الخصم ورقم الطلب." }, { status: 400 });
  }

  try {
    const result = await applyPromoCodeToOrder({ orderId, userId: user.id, code });

    return jsonNoStore(
      {
        message: "تم تطبيق رمز الخصم بنجاح.",
        promo: {
          code: result.code,
          type: result.type,
          discountCents: result.discountCents,
          finalTotalCents: result.finalTotalCents,
          isFree: result.finalTotalCents === 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof PromoError) {
      return jsonNoStore({ message: error.message, code: error.code }, { status: 409 });
    }

    return jsonError(API_ERROR_CODES.server_error, "تعذر تطبيق الرمز حالياً.", 500);
  }
}
