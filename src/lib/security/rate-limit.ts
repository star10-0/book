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
  backend: "kv" | "memory" | "unavailable";
  reason?: "RATE_LIMIT_BACKEND_UNAVAILABLE" | "RATE_LIMIT_ENV_MISCONFIG";
  details?: "missing_kv_credentials" | "kv_request_failed" | "kv_invalid_response";
};

type KvCheckResult =
  | { status: "ok"; result: RateLimitResult }
  | { status: "missing_config" }
  | { status: "request_failed" }
  | { status: "invalid_response" };

type MemoryWindow = {
  count: number;
  resetAt: number;
};

const memoryWindows = new Map<string, MemoryWindow>();

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

function checkMemoryRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - (now % config.windowMs);
  const resetAt = windowStart + config.windowMs;
  const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
  const key = `ratelimit:${config.key}:${windowStart}`;

  const current = memoryWindows.get(key);

  if (!current || current.resetAt <= now) {
    memoryWindows.set(key, { count: 1, resetAt });
    return buildResult(1, config.limit, retryAfterSeconds, "memory");
  }

  current.count += 1;
  return buildResult(current.count, config.limit, retryAfterSeconds, "memory");
}

function getUnavailableResult(
  reason: RateLimitResult["reason"],
  details?: RateLimitResult["details"],
): RateLimitResult {
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 60,
    backend: "unavailable",
    reason,
    details,
  };
}

async function checkKvRateLimit(config: RateLimitConfig): Promise<KvCheckResult> {
  const kv = getKvConfig();

  if (!kv) {
    return { status: "missing_config" };
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
    return { status: "request_failed" };
  }

  const payload = (await response.json()) as Array<{ result?: unknown }>;
  const countValue = payload?.[0]?.result;
  const count = typeof countValue === "number" ? countValue : Number.parseInt(String(countValue ?? "0"), 10);

  if (!Number.isFinite(count) || count <= 0) {
    return { status: "invalid_response" };
  }

  return {
    status: "ok",
    result: buildResult(count, config.limit, retryAfterSeconds, "kv"),
  };
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const requireDistributed = Boolean(config.requireDistributedInProduction && process.env.NODE_ENV === "production");

  try {
    const kvCheck = await checkKvRateLimit(config);
    if (kvCheck.status === "ok") {
      return kvCheck.result;
    }

    if (!requireDistributed) {
      return checkMemoryRateLimit(config);
    }

    if (kvCheck.status === "missing_config") {
      return getUnavailableResult("RATE_LIMIT_ENV_MISCONFIG", "missing_kv_credentials");
    }

    if (kvCheck.status === "invalid_response") {
      return getUnavailableResult("RATE_LIMIT_BACKEND_UNAVAILABLE", "kv_invalid_response");
    }

    return getUnavailableResult("RATE_LIMIT_BACKEND_UNAVAILABLE", "kv_request_failed");
  } catch {
    if (!requireDistributed) {
      return checkMemoryRateLimit(config);
    }

    return getUnavailableResult("RATE_LIMIT_BACKEND_UNAVAILABLE", "kv_request_failed");
  }
}
