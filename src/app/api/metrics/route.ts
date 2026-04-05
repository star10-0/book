import { renderPrometheusMetrics } from "@/lib/observability/metrics";

type MetricsAuthDecision =
  | { ok: true }
  | { ok: false; status: 401; reason: "UNAUTHORIZED" }
  | { ok: false; status: 503; reason: "TOKEN_UNSET_IN_PRODUCTION" };

function evaluateMetricsAuth(request: Request): MetricsAuthDecision {
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

export async function GET(request: Request) {
  const auth = evaluateMetricsAuth(request);
  if (!auth.ok) {
    const body = auth.reason === "TOKEN_UNSET_IN_PRODUCTION" ? "metrics token is not configured\n" : "unauthorized\n";

    return new Response(body, {
      status: auth.status,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const payload = renderPrometheusMetrics();

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export { evaluateMetricsAuth };
