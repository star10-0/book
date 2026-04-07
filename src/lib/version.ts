function readFirstSetEnvKey(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function getCommitSha() {
  return readFirstSetEnvKey([
    "APP_GIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "RAILWAY_GIT_COMMIT_SHA",
    "RENDER_GIT_COMMIT",
    "COMMIT_SHA",
    "GIT_COMMIT",
  ]);
}

export function getOperationalDiagnostics() {
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

export function getPublicBuildId() {
  const sha = getCommitSha();
  if (!sha) return null;

  const normalized = sha.trim();
  if (normalized.length < 8) return null;
  return normalized.slice(0, 8);
}
