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

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const current = store.get(config.key);

  if (!current || now >= current.resetAt) {
    store.set(config.key, { count: 1, resetAt: now + config.windowMs });
    pruneExpired(now);
    return {
      allowed: true,
      remaining: Math.max(config.limit - 1, 0),
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  current.count += 1;
  store.set(config.key, current);

  const allowed = current.count <= config.limit;
  const remaining = Math.max(config.limit - current.count, 0);
  const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);

  return {
    allowed,
    remaining,
    retryAfterSeconds,
  };
}

function pruneExpired(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}
