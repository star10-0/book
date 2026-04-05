export type MetricsAuthDecision =
  | { ok: true }
  | { ok: false; status: 401; reason: "UNAUTHORIZED" }
  | { ok: false; status: 503; reason: "TOKEN_UNSET_IN_PRODUCTION" };

export function evaluateMetricsAuth(request: Request): MetricsAuthDecision {
  const expected = process.env.METRICS_TOKEN?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!expected) {
    if (isProduction) {
      return { ok: false, status: 503, reason: "TOKEN_UNSET_IN_PRODUCTION" };
    }

    return { ok: true };
  }

  const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const queryToken = new URL(request.url).searchParams.get("token")?.trim();

  if (headerToken === expected || queryToken === expected) {
    return { ok: true };
  }

  return { ok: false, status: 401, reason: "UNAUTHORIZED" };
}
