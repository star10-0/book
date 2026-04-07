import { NextResponse } from "next/server";
import { getAppBaseUrl, getNodeEnv, readOptionalServerEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/security/rate-limit";

const SAME_ORIGIN_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function parseTrustedOriginsFromEnv() {
  const configured = readOptionalServerEnv("TRUSTED_ORIGINS");
  if (!configured) {
    return [];
  }

  return configured
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .flatMap((value) => {
      try {
        return [normalizeOrigin(new URL(value).toString())];
      } catch {
        return [];
      }
    });
}

function getAllowedOrigins(request: Request) {
  const origins = new Set<string>();
  origins.add(normalizeOrigin(getAppBaseUrl()));

  for (const origin of parseTrustedOriginsFromEnv()) {
    origins.add(origin);
  }

  if (getNodeEnv() !== "production") {
    try {
      origins.add(normalizeOrigin(new URL(request.url).origin));
    } catch {
      // ignore malformed request URL in non-production fallback resolution
    }
  }

  return origins;
}

export function isSameOriginMutation(request: Request) {
  if (!SAME_ORIGIN_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  const allowedOrigins = getAllowedOrigins(request);
  return allowedOrigins.has(normalizeOrigin(origin));
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
