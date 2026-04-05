import { renderPrometheusMetrics } from "@/lib/observability/metrics";
import { evaluateMetricsAuth } from "@/lib/metrics-auth";

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
