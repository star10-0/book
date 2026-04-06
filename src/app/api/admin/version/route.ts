import { requireAdminScope } from "@/lib/auth-session";
import { recordApiResponse } from "@/lib/observability/metrics";
import { jsonNoStore } from "@/lib/security";
import { getCommitSha, getOperationalDiagnostics } from "@/lib/version";

export async function GET() {
  await requireAdminScope("SUPER_ADMIN", { callbackUrl: "/admin" });

  recordApiResponse({ route: "/api/admin/version", status: 200 });

  return jsonNoStore({
    commitSha: getCommitSha(),
    generatedAt: new Date().toISOString(),
    diagnostics: getOperationalDiagnostics(),
  });
}
