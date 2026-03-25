const store = new Map<string, { count: number; resetAt: number }>();

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
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

function buildResult(count: number, limit: number, retryAfterSeconds: number): RateLimitResult {
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(limit - count, 0),
    retryAfterSeconds: Math.max(retryAfterSeconds, 1),
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

  return buildResult(count, config.limit, retryAfterSeconds);
}

function checkInMemoryRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const current = store.get(config.key);

  if (!current || now >= current.resetAt) {
    store.set(config.key, { count: 1, resetAt: now + config.windowMs });
    pruneExpired(now);
    return buildResult(1, config.limit, Math.ceil(config.windowMs / 1000));
  }

  current.count += 1;
  store.set(config.key, current);

  return buildResult(current.count, config.limit, Math.ceil((current.resetAt - now) / 1000));
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const kvResult = await checkKvRateLimit(config);
    if (kvResult) {
      return kvResult;
    }
  } catch {
    // Fall back to in-memory limiting when KV is unavailable.
  }

  return checkInMemoryRateLimit(config);
}

function pruneExpired(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}
