import "server-only";
const FULL_REDACTION_PATTERNS = [
  /authorization/i,
  /token/i,
  /api[-_]?key/i,
  /secret/i,
  /password/i,
  /cookie/i,
  /set-cookie/i,
  /signature/i,
  /credential/i,
];

const MASKED_REDACTION_PATTERNS = [
  /provider[-_]?ref(erence)?/i,
  /transaction[-_]?ref(erence)?/i,
  /payment[-_]?ref(erence)?/i,
  /destination[-_]?account/i,
  /receiver[-_]?account/i,
  /merchant[-_]?account/i,
  /account[-_]?address/i,
  /^(tx|transaction_id|gsm)$/i,
];

const MAX_DEPTH = 6;

function shouldFullyRedact(key: string): boolean {
  return FULL_REDACTION_PATTERNS.some((pattern) => pattern.test(key));
}

function shouldMask(key: string): boolean {
  return MASKED_REDACTION_PATTERNS.some((pattern) => pattern.test(key));
}

function maskValue(value: unknown): string {
  if (typeof value !== "string") {
    return "[REDACTED]";
  }

  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return "****";
  }

  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

function redactByKey(key: string, value: unknown): unknown {
  if (shouldFullyRedact(key)) {
    return "[REDACTED]";
  }

  if (shouldMask(key)) {
    return maskValue(value);
  }

  return value;
}

function sanitizeString(value: string): string {
  if (/^Bearer\s+/i.test(value)) {
    return "Bearer [REDACTED]";
  }

  return value
    .replace(/([?&](?:token|api[_-]?key|secret|signature|password|authorization)=)[^&]+/gi, "$1[REDACTED]")
    .replace(/(x-api-key[:=]\s*)[^\s,]+/gi, "$1[REDACTED]");
}

function redactInternal(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item, depth + 1, seen));
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }
  seen.add(value);

  const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
    const keyRedactedValue = redactByKey(key, nestedValue);
    return [key, redactInternal(keyRedactedValue, depth + 1, seen)];
  });

  return Object.fromEntries(entries);
}

export function redactSensitiveData<T>(value: T): T {
  if (value == null) {
    return value;
  }

  return redactInternal(value, 0, new WeakSet<object>()) as T;
}

export function sanitizeForLogs<T>(value: T): T {
  return redactSensitiveData(value);
}
