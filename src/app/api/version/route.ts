import { recordApiResponse } from "@/lib/observability/metrics";
import { jsonNoStore } from "@/lib/security";
import { getPublicBuildId } from "@/lib/version";

export async function GET() {
  recordApiResponse({ route: "/api/version", status: 200 });

  return jsonNoStore({
    buildId: getPublicBuildId(),
    generatedAt: new Date().toISOString(),
  });
}
