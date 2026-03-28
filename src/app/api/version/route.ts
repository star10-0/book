import { jsonNoStore } from "@/lib/security";
import { recordApiResponse } from "@/lib/observability/metrics";

function readFirstSetEnvKey(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export async function GET() {
  recordApiResponse({ route: "/api/version", status: 200 });
  const commitSha = readFirstSetEnvKey([
    "APP_GIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "RENDER_GIT_COMMIT",
    "COMMIT_SHA",
    "GIT_COMMIT",
  ]);

  const branch = readFirstSetEnvKey([
    "APP_GIT_BRANCH",
    "VERCEL_GIT_COMMIT_REF",
    "RAILWAY_GIT_BRANCH",
    "RENDER_GIT_BRANCH",
    "GIT_BRANCH",
  ]);

  return jsonNoStore({
    commitSha,
    branch,
    mode: process.env.PAYMENT_GATEWAY_MODE?.trim() ?? "mock",
    liveProviders: process.env.PAYMENT_LIVE_PROVIDERS?.trim() ?? null,
    syriatelIntegration: "manual_transfer_find_tx_v1",
    generatedAt: new Date().toISOString(),
  });
}
