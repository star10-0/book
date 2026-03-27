import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { completeFreeOrderWithPromo, PromoError } from "@/lib/promos";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimited } from "@/lib/security";

interface CompleteFreeBody {
  orderId?: string;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  const clientIp = request.headers.get("x-forwarded-for") ?? "local";
  const rateLimit = await enforceRateLimit({ key: `checkout:complete-free:${clientIp}`, limit: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) return rejectRateLimited(rateLimit.retryAfterSeconds);

  const user = await getCurrentUser();
  if (!user) return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);

  const parsedBody = await parseJsonBody<CompleteFreeBody>(request, { invalidMessage: "تعذر قراءة بيانات الإتمام المجاني." });
  if ("error" in parsedBody) return parsedBody.error;

  const orderId = parsedBody.data.orderId?.trim();
  if (!orderId) return jsonNoStore({ message: "رقم الطلب مطلوب." }, { status: 400 });

  try {
    const result = await completeFreeOrderWithPromo({ orderId, userId: user.id });
    return jsonNoStore(
      {
        message: result.alreadyCompleted ? "الطلب مكتمل مسبقاً." : "تم إتمام الطلب المجاني بنجاح.",
        order: { id: result.orderId, status: "PAID" },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof PromoError) {
      return jsonNoStore({ message: error.message, code: error.code }, { status: 409 });
    }

    return jsonError(API_ERROR_CODES.server_error, "تعذر إتمام الطلب المجاني حالياً.", 500);
  }
}
