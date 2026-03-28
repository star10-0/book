import { jsonNoStore } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/observability/logger";
import { recordApiResponse, recordHealthCheck } from "@/lib/observability/metrics";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    recordHealthCheck("ok");
    recordApiResponse({ route: "/api/health", status: 200 });

    return jsonNoStore({
      status: "ok",
      service: "book",
      database: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError("Health check degraded", error, { route: "/api/health" });
    recordHealthCheck("degraded");
    recordApiResponse({ route: "/api/health", status: 503 });
    return jsonNoStore(
      {
        status: "degraded",
        service: "book",
        database: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
