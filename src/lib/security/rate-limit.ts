export type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
  requireDistributedInProduction?: boolean;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  backend: "kv" | "unavailable";
  reason?: "RATE_LIMIT_BACKEND_UNAVAILABLE";
};

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function getKvConfig() {
  const url = readOptionalEnv("KV_REST_API_URL") ?? readOptionalEnv("UPSTASH_REDIS_REST_URL");
  const token = readOptionalEnv("KV_REST_API_TOKEN") ?? readOptionalEnv("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function buildResult(
  count: number,
  limit: number,
  retryAfterSeconds: number,
  backend: RateLimitResult["backend"],
): RateLimitResult {
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(limit - count, 0),
    retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    backend,
  };
}

async function checkKvRateLimit(config: RateLimitConfig): Promise<RateLimitResult | null> {
  const kv = getKvConfig();

  if (!kv) {
    return null;
  }

  const now = Date.now();
  const windowStart = now - (now % config.windowMs);
  const resetAt = windowStart + config.windowMs;
  const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
  const key = `ratelimit:${config.key}:${windowStart}`;

  const response = await fetch(`${kv.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kv.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(config.windowMs), "NX"],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{ result?: unknown }>;
  const countValue = payload?.[0]?.result;
  const count = typeof countValue === "number" ? countValue : Number.parseInt(String(countValue ?? "0"), 10);

  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  return buildResult(count, config.limit, retryAfterSeconds, "kv");
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const kvResult = await checkKvRateLimit(config);
    if (kvResult) {
      return kvResult;
    }
  } catch {
    // fallback handled below
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 60,
    backend: "unavailable",
    reason: "RATE_LIMIT_BACKEND_UNAVAILABLE",
  };
}
