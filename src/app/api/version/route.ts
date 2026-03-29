import { getCurrentUser } from "@/lib/auth-session";
import { isAdminRole } from "@/lib/authz";
import { recordApiResponse } from "@/lib/observability/metrics";
import { jsonNoStore } from "@/lib/security";

function readFirstSetEnvKey(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function getCommitSha() {
  return readFirstSetEnvKey([
    "APP_GIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "RENDER_GIT_COMMIT",
    "COMMIT_SHA",
    "GIT_COMMIT",
  ]);
}

function getOperationalDiagnostics() {
  return {
    branch: readFirstSetEnvKey([
      "APP_GIT_BRANCH",
      "VERCEL_GIT_COMMIT_REF",
      "RAILWAY_GIT_BRANCH",
      "RENDER_GIT_BRANCH",
      "GIT_BRANCH",
    ]),
    payment: {
      mode: process.env.PAYMENT_GATEWAY_MODE?.trim() ?? "mock",
      liveProviders: process.env.PAYMENT_LIVE_PROVIDERS?.trim() ?? null,
      syriatelIntegration: "manual_transfer_find_tx_v1",
    },
  };
}

export async function GET() {
  const user = await getCurrentUser();
  const isAdmin = Boolean(user && isAdminRole(user.role));

  recordApiResponse({ route: "/api/version", status: 200 });

  return jsonNoStore({
    commitSha: getCommitSha(),
    generatedAt: new Date().toISOString(),
    ...(isAdmin ? { diagnostics: getOperationalDiagnostics() } : {}),
  });
}
