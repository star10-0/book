import { recordApiResponse } from "@/lib/observability/metrics";
import { jsonNoStore } from "@/lib/security";
import { getCommitSha } from "@/lib/version";

export async function GET() {
  recordApiResponse({ route: "/api/version", status: 200 });

  return jsonNoStore({
    commitSha: getCommitSha(),
    generatedAt: new Date().toISOString(),
  });
}
