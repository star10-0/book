import { renderPrometheusMetrics } from "@/lib/observability/metrics";

function isAuthorized(request: Request) {
  const expected = process.env.METRICS_TOKEN?.trim();
  if (!expected) {
    return true;
  }

  const headerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const queryToken = new URL(request.url).searchParams.get("token")?.trim();

  return headerToken === expected || queryToken === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("unauthorized\n", {
      status: 401,
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
