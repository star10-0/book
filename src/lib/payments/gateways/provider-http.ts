import { logInfo } from "@/lib/observability/logger";

const DEFAULT_TIMEOUT_MS = 10_000;

const SENSITIVE_KEY_PATTERN = /(authorization|token|secret|password|api[-_]?key|signature)/i;

export class GatewayConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayConfigurationError";
  }
}

export class GatewayRequestError extends Error {
  readonly provider: string;
  readonly phase: "create" | "verify";
  readonly statusCode?: number;

  constructor(input: { provider: string; phase: "create" | "verify"; message: string; statusCode?: number }) {
    super(input.message);
    this.name = "GatewayRequestError";
    this.provider = input.provider;
    this.phase = input.phase;
    this.statusCode = input.statusCode;
  }
}

export function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new GatewayConfigurationError(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readOptionalTimeoutMs(name: string): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new GatewayConfigurationError(`Invalid timeout value for ${name}. Expected a positive integer.`);
  }

  return parsed;
}

export function safeLogProviderResponse(provider: string, phase: "create" | "verify", payload: unknown) {
  logInfo("Payment provider response", { provider, phase, payload: sanitizeForLogs(payload) });
}

export function sanitizeForLogs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [key, "[REDACTED]"];
      }

      return [key, sanitizeForLogs(nestedValue)];
    }),
  );
}

export async function postProviderJson(input: {
  provider: string;
  phase: "create" | "verify";
  endpoint: string;
  headers?: Record<string, string>;
  body: Record<string, unknown>;
  timeoutMs: number;
}): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(input.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...input.headers,
      },
      body: JSON.stringify(input.body),
      signal: controller.signal,
      cache: "no-store",
    });

    const textPayload = await response.text();
    const jsonPayload = parseJsonRecord(textPayload);

    safeLogProviderResponse(input.provider, input.phase, {
      status: response.status,
      ok: response.ok,
      payload: jsonPayload,
    });

    if (!response.ok) {
      throw new GatewayRequestError({
        provider: input.provider,
        phase: input.phase,
        statusCode: response.status,
        message: `Provider API request failed with status ${response.status}.`,
      });
    }

    return jsonPayload;
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GatewayRequestError({
        provider: input.provider,
        phase: input.phase,
        message: `Provider API request timed out after ${input.timeoutMs}ms.`,
      });
    }

    throw new GatewayRequestError({
      provider: input.provider,
      phase: input.phase,
      message: "Provider API request failed unexpectedly.",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonRecord(value: string): Record<string, unknown> {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return {
      data: parsed,
    };
  } catch {
    return {
      raw: value,
    };
  }
}

export function extractProviderReference(payload: Record<string, unknown>): string | undefined {
  const candidates = [payload.providerReference, payload.reference, payload.paymentReference, payload.id];

  return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
}

export function isPaidStatus(payload: Record<string, unknown>): boolean {
  if (payload.found === true) {
    return true;
  }

  const rawStatus = [payload.status, payload.paymentStatus, payload.transactionStatus].find(
    (candidate): candidate is string => typeof candidate === "string",
  );

  const status = rawStatus?.toLowerCase();

  return status === "paid" || status === "succeeded" || status === "success" || status === "completed";
}

export function extractFailureReason(payload: Record<string, unknown>): string | undefined {
  const rawReason = [payload.failureReason, payload.reason, payload.message, payload.error].find(
    (candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0,
  );

  return rawReason?.trim();
}
