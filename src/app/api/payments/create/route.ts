import { PaymentProvider } from "@prisma/client";
import { API_ERROR_CODES, jsonError, parseJsonBody } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth-session";
import { logError, getClientIp, getRequestId } from "@/lib/observability/logger";
import { recordApiResponse, recordPaymentEvent } from "@/lib/observability/metrics";
import { GatewayConfigurationError, GatewayRequestError } from "@/lib/payments/gateways/provider-http";
import { getProviderIntegrationConfig, parseSelectedLiveProviders } from "@/lib/payments/gateways/provider-integration";
import { isPaymentError, PAYMENT_ERROR_CODES } from "@/lib/payments/errors";
import { createPaymentForOrder } from "@/lib/payments/payment-service";
import { enforceRateLimit, isSameOriginMutation, jsonNoStore, rejectCrossOriginMutation, rejectRateLimitUnavailable, rejectRateLimited } from "@/lib/security";

interface CreatePaymentRequestBody {
  orderId?: string;
  provider?: PaymentProvider;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientIp = getClientIp(request);

  if (!isSameOriginMutation(request)) {
    return rejectCrossOriginMutation();
  }

  const rateLimit = await enforceRateLimit({ key: `payments:create:${clientIp}`, limit: 40, windowMs: 60_000, requireDistributedInProduction: true });
  if (!rateLimit.allowed) {
    if (rateLimit.reason === "RATE_LIMIT_BACKEND_UNAVAILABLE") {
      return rejectRateLimitUnavailable();
    }
    return rejectRateLimited(rateLimit.retryAfterSeconds);
  }

  const parsedBody = await parseJsonBody<CreatePaymentRequestBody>(request, { invalidMessage: "تعذر قراءة بيانات الدفع." });
  if ("error" in parsedBody) {
    return parsedBody.error;
  }
  const body = parsedBody.data;

  const orderId = body.orderId?.trim();
  const provider = body.provider;

  if (!orderId || !provider) {
    return jsonError(API_ERROR_CODES.invalid_request, "الطلب غير مكتمل.", 400);
  }

  if (!Object.values(PaymentProvider).includes(provider)) {
    return jsonError(API_ERROR_CODES.invalid_request, "مزود الدفع غير صالح.", 400);
  }

  const integration = getProviderIntegrationConfig(provider);
  const selectedProviders = parseSelectedLiveProviders();
  if (integration && integration.mode === "live" && selectedProviders.invalidProviders.length > 0) {
    return jsonNoStore(
      {
        message: "قيمة مزودي الدفع المباشرين غير صالحة على الخادم.",
        error: {
          code: "PAYMENT_LIVE_PROVIDERS_INVALID",
          mode: integration.mode,
          selectedLiveProviders: selectedProviders.selectedProviders,
          invalidProviders: selectedProviders.invalidProviders,
        },
      },
      { status: 500 },
    );
  }

  if (integration && integration.mode === "live" && selectedProviders.selectedProviders.length === 0) {
    return jsonNoStore(
      {
        message: "لا يوجد مزود دفع مباشر مفعّل على الخادم.",
        error: {
          code: "PAYMENT_LIVE_PROVIDERS_EMPTY",
          mode: integration.mode,
          selectedLiveProviders: selectedProviders.selectedProviders,
          invalidProviders: selectedProviders.invalidProviders,
        },
      },
      { status: 500 },
    );
  }

  if (
    integration &&
    integration.mode === "live" &&
    !selectedProviders.selectedProviders.includes(integration.provider)
  ) {
    return jsonNoStore(
      {
        message: "مزود الدفع غير مفعّل حالياً.",
        error: {
          code: "PAYMENT_PROVIDER_DISABLED",
          provider: integration.provider,
          mode: integration.mode,
          selectedLiveProviders: selectedProviders.selectedProviders,
        },
      },
      { status: 409 },
    );
  }

  if (integration && integration.mode === "live" && !integration.isLiveConfigured) {
    return jsonNoStore(
      {
        message: "إعدادات مزود الدفع غير مكتملة على الخادم.",
        error: {
          code: "PAYMENT_PROVIDER_ENV_MISSING",
          provider: integration.provider,
          mode: integration.mode,
          missingEnvKeys: integration.missingEnvKeys,
        },
      },
      { status: 500 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError(API_ERROR_CODES.unauthorized, "يجب تسجيل الدخول أولاً.", 401);
  }

  try {
    const result = await createPaymentForOrder({
      orderId,
      provider,
      userId: user.id,
    });
    recordApiResponse({ route: "/api/payments/create", status: result.reused ? 200 : 201 });
    recordPaymentEvent({ flow: "create", outcome: "success", reason: result.reused ? "reused_attempt" : "created" });

    return jsonNoStore(
      {
        message: result.reused ? "تم استرجاع محاولة دفع جارية." : "تم إنشاء محاولة الدفع.",
        payment: {
          id: result.payment.id,
          status: result.payment.status,
          provider: result.payment.provider,
        },
        attempt: {
          id: result.attempt.id,
          status: result.attempt.status,
        },
        checkoutUrl: result.checkoutUrl,
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch (error) {
    if (isPaymentError(error, PAYMENT_ERROR_CODES.orderNotFound)) {
      return jsonNoStore({ message: "الطلب غير موجود." }, { status: 404 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.orderNotPayable)) {
      return jsonNoStore({ message: "لا يمكن دفع هذا الطلب حالياً." }, { status: 409 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.zeroAmountOrder)) {
      return jsonNoStore({ message: "هذا الطلب مجاني بالكامل. استخدم إتمام الطلب المجاني بدلاً من الدفع الخارجي." }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith("No payment gateway")) {
      return jsonNoStore({ message: "مزود الدفع غير مدعوم حالياً." }, { status: 400 });
    }

    if (isPaymentError(error, PAYMENT_ERROR_CODES.duplicateProviderReference)) {
      return jsonNoStore({ message: "مرجع الدفع مستخدم مسبقاً، يرجى إعادة المحاولة." }, { status: 409 });
    }

    if (error instanceof GatewayConfigurationError) {
      recordApiResponse({ route: "/api/payments/create", status: 500 });
      recordPaymentEvent({ flow: "create", outcome: "failure", reason: "provider_env_missing" });
      const integration = getProviderIntegrationConfig(provider);
      return jsonNoStore(
        {
          message: "إعدادات مزود الدفع غير مكتملة على الخادم.",
          error: {
            code: "PAYMENT_PROVIDER_ENV_MISSING",
            provider: integration?.provider ?? provider,
            mode: integration?.mode ?? "live",
            missingEnvKeys: integration?.missingEnvKeys ?? [],
          },
        },
        { status: 500 },
      );
    }

    if (error instanceof GatewayRequestError) {
      recordApiResponse({ route: "/api/payments/create", status: 502 });
      recordPaymentEvent({ flow: "create", outcome: "failure", reason: "gateway_request_failed" });
      return jsonNoStore({ message: "تعذر إنشاء عملية الدفع لدى مزود الخدمة حالياً." }, { status: 502 });
    }

    recordApiResponse({ route: "/api/payments/create", status: 500 });
    recordPaymentEvent({ flow: "create", outcome: "failure", reason: "internal_error" });
    logError("Failed to create payment", error, { route: "/api/payments/create", requestId, ip: clientIp, userId: user.id });
    return jsonError(API_ERROR_CODES.server_error, "تعذر إنشاء محاولة الدفع حالياً. حاول لاحقاً.", 500);
  }
}
