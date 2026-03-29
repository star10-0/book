import { getCurrentUser } from "@/lib/auth-session";
import { isAdminRole } from "@/lib/authz";
import { recordApiResponse } from "@/lib/observability/metrics";
import { jsonNoStore } from "@/lib/security";
import { getCommitSha, getOperationalDiagnostics } from "@/lib/version";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !isAdminRole(user.role)) {
    recordApiResponse({ route: "/api/admin/version", status: 403 });
    return jsonNoStore({ message: "Forbidden" }, { status: 403 });
  }

  recordApiResponse({ route: "/api/admin/version", status: 200 });

  return jsonNoStore({
    commitSha: getCommitSha(),
    generatedAt: new Date().toISOString(),
    diagnostics: getOperationalDiagnostics(),
  });
}
