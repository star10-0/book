import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

const SAME_ORIGIN_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function getAllowedOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return null;
  }

  return `${proto}://${host}`;
}

export function isSameOriginMutation(request: Request) {
  if (!SAME_ORIGIN_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  const allowedOrigin = getAllowedOrigin(request);

  if (!allowedOrigin) {
    return false;
  }

  return normalizeOrigin(origin) === normalizeOrigin(allowedOrigin);
}

export function rejectCrossOriginMutation() {
  return NextResponse.json({ message: "تم رفض الطلب لأسباب أمنية." }, { status: 403, headers: { "Cache-Control": "no-store" } });
}

export function rejectRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { message: "عدد الطلبات كبير جداً. يرجى المحاولة بعد قليل." },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function rejectRateLimitUnavailable(reason?: string) {
  return NextResponse.json(
    { message: "الخدمة محمية مؤقتاً. يرجى المحاولة بعد قليل.", code: reason ?? "RATE_LIMIT_BACKEND_UNAVAILABLE" },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    },
  );
}

export async function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  requireDistributedInProduction?: boolean;
}) {
  return await checkRateLimit(input);
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
