import "server-only";
import {
  getLiveProvidersEnvKey,
  getMissingLiveEnvKeys,
  getSupportedLiveProviders,
  parseSelectedLiveProviders,
} from "@/lib/payments/gateways/provider-integration";

type RuntimeEnvironment = "development" | "test" | "production";

type EnvSeverity = "error" | "warning";

type EnvIssue = {
  severity: EnvSeverity;
  key: string;
  message: string;
};

let hasValidated = false;
const DEPRECATED_ENV_KEYS: readonly string[] = [
  "SYRIATEL_CASH_MERCHANT_ID",
  "SYRIATEL_CASH_CREATE_PAYMENT_PATH",
  "SYRIATEL_CASH_VERIFY_PAYMENT_PATH",
];

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readOptionalServerEnv(key: string): string | undefined {
  return readEnv(key);
}

export function readRequiredServerEnv(key: string): string {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getNodeEnv(): RuntimeEnvironment {
  const value = readEnv("NODE_ENV");

  if (value === "production" || value === "test") {
    return value;
  }

  return "development";
}

export function getAppBaseUrl(): string {
  const rawBaseUrl = readEnv("APP_BASE_URL") ?? readEnv("NEXTAUTH_URL") ?? "https://book.example";

  try {
    return new URL(rawBaseUrl).toString().replace(/\/$/, "");
  } catch {
    return "https://book.example";
  }
}

function validateEnvironment(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const nodeEnv = getNodeEnv();

  if (!readEnv("DATABASE_URL")) {
    issues.push({
      severity: "error",
      key: "DATABASE_URL",
      message: "DATABASE_URL is required.",
    });
  }

  const authSecret = readEnv("AUTH_SECRET");
  if (!authSecret) {
    issues.push({
      severity: "error",
      key: "AUTH_SECRET",
      message: "AUTH_SECRET is required.",
    });
  } else if (nodeEnv === "production" && authSecret.length < 32) {
    issues.push({
      severity: "error",
      key: "AUTH_SECRET",
      message: "AUTH_SECRET must be at least 32 characters in production.",
    });
  }

  const rawPaymentMode = readEnv("PAYMENT_GATEWAY_MODE");
  if (nodeEnv === "production" && !rawPaymentMode) {
    issues.push({
      severity: "error",
      key: "PAYMENT_GATEWAY_MODE",
      message: "PAYMENT_GATEWAY_MODE is required in production.",
    });
  }

  const paymentMode = (rawPaymentMode ?? "mock").toLowerCase();
  if (paymentMode !== "mock" && paymentMode !== "live") {
    issues.push({
      severity: nodeEnv === "production" ? "error" : "warning",
      key: "PAYMENT_GATEWAY_MODE",
      message: "PAYMENT_GATEWAY_MODE should be either 'mock' or 'live'.",
    });
  }


  const allowMockVerification = (readEnv("ALLOW_MOCK_PAYMENT_VERIFICATION") ?? "false").toLowerCase();
  const allowMockGateways = (readEnv("ALLOW_MOCK_PAYMENTS") ?? "false").toLowerCase();
  if (nodeEnv === "production" && allowMockVerification === "true") {
    issues.push({
      severity: "error",
      key: "ALLOW_MOCK_PAYMENT_VERIFICATION",
      message: "ALLOW_MOCK_PAYMENT_VERIFICATION must remain false in production.",
    });
  }

  if (nodeEnv === "production" && allowMockGateways === "true") {
    issues.push({
      severity: "error",
      key: "ALLOW_MOCK_PAYMENTS",
      message: "ALLOW_MOCK_PAYMENTS must remain false in production.",
    });
  }

  if (nodeEnv === "production") {
    const kvUrl = readEnv("KV_REST_API_URL") ?? readEnv("UPSTASH_REDIS_REST_URL");
    const kvToken = readEnv("KV_REST_API_TOKEN") ?? readEnv("UPSTASH_REDIS_REST_TOKEN");

    if (!kvUrl || !kvToken) {
      issues.push({
        severity: "error",
        key: "KV_REST_API_URL",
        message: "KV/Redis REST credentials are required in production for auth/payment rate limiting.",
      });
    }
  }

  if (paymentMode === "live") {
    const providersSelection = parseSelectedLiveProviders();

    if (providersSelection.invalidProviders.length > 0) {
      issues.push({
        severity: nodeEnv === "production" ? "error" : "warning",
        key: getLiveProvidersEnvKey(),
        message: `${getLiveProvidersEnvKey()} contains unsupported providers. Use only: ${getSupportedLiveProviders().join(", ")}.`,
      });
    }

    if (providersSelection.selectedProviders.length === 0) {
      issues.push({
        severity: nodeEnv === "production" ? "error" : "warning",
        key: getLiveProvidersEnvKey(),
        message:
          `PAYMENT_GATEWAY_MODE=live requires at least one selected provider via ${getLiveProvidersEnvKey()}.`,
      });
    }

    for (const provider of providersSelection.selectedProviders) {
      const missingEnv = getMissingLiveEnvKeys(provider);
      for (const envKey of missingEnv) {
        issues.push({
          severity: nodeEnv === "production" ? "error" : "warning",
          key: envKey,
          message: `${envKey} is required when PAYMENT_GATEWAY_MODE=live and ${provider} is selected in ${getLiveProvidersEnvKey()}.`,
        });
      }
    }
  }

  for (const deprecatedKey of DEPRECATED_ENV_KEYS) {
    if (readEnv(deprecatedKey)) {
      issues.push({
        severity: "warning",
        key: deprecatedKey,
        message: `${deprecatedKey} is deprecated and ignored by the current Syriatel Cash manual-transfer/find_tx integration.`,
      });
    }
  }

  const rawStorageProvider = readEnv("BOOK_STORAGE_PROVIDER");
  if (nodeEnv === "production" && !rawStorageProvider) {
    issues.push({
      severity: "error",
      key: "BOOK_STORAGE_PROVIDER",
      message: "BOOK_STORAGE_PROVIDER is required in production.",
    });
  }

  const storageProvider = (rawStorageProvider ?? "local").toLowerCase();
  if (!["local", "s3", "r2"].includes(storageProvider)) {
    issues.push({
      severity: nodeEnv === "production" ? "error" : "warning",
      key: "BOOK_STORAGE_PROVIDER",
      message: "BOOK_STORAGE_PROVIDER should be one of: local, s3, r2.",
    });
  }

  if (nodeEnv === "production" && storageProvider === "local") {
    issues.push({
      severity: "warning",
      key: "BOOK_STORAGE_PROVIDER",
      message: "Using local storage in production can lose files on ephemeral hosts. Prefer object storage.",
    });
  }

  if (storageProvider === "s3" || storageProvider === "r2") {
    const cloudStorageRequired = [
      "BOOK_STORAGE_S3_ACCESS_KEY_ID",
      "BOOK_STORAGE_S3_SECRET_ACCESS_KEY",
      "BOOK_STORAGE_S3_PUBLIC_BUCKET",
    ];

    for (const key of cloudStorageRequired) {
      if (!readEnv(key)) {
        issues.push({
          severity: nodeEnv === "production" ? "error" : "warning",
          key,
          message: `${key} is required when BOOK_STORAGE_PROVIDER is set to s3/r2.`,
        });
      }
    }
  }

  const nextAuthUrl = readEnv("NEXTAUTH_URL");
  if (nodeEnv === "production" && !nextAuthUrl) {
    issues.push({
      severity: "error",
      key: "NEXTAUTH_URL",
      message: "NEXTAUTH_URL is required in production.",
    });
  }

  if (nextAuthUrl) {
    try {
      new URL(nextAuthUrl);
    } catch {
      issues.push({
        severity: nodeEnv === "production" ? "error" : "warning",
        key: "NEXTAUTH_URL",
        message: "NEXTAUTH_URL must be a valid absolute URL.",
      });
    }
  }

  const appBaseUrl = readEnv("APP_BASE_URL");
  if (nodeEnv === "production" && !appBaseUrl) {
    issues.push({
      severity: "error",
      key: "APP_BASE_URL",
      message: "APP_BASE_URL is required in production.",
    });
  }

  if (appBaseUrl) {
    try {
      new URL(appBaseUrl);
    } catch {
      issues.push({
        severity: nodeEnv === "production" ? "error" : "warning",
        key: "APP_BASE_URL",
        message: "APP_BASE_URL must be a valid absolute URL.",
      });
    }
  }

  return issues;
}

export function validateServerEnv() {
  const issues = validateEnvironment();
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    issues,
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

export function assertServerEnv() {
  const result = validateServerEnv();

  if (!result.isValid) {
    const keys = result.errors.map((issue) => issue.key).join(", ");
    throw new Error(`Invalid server environment configuration. Missing or invalid keys: ${keys}`);
  }

  return result;
}

export function validateServerEnvOnce(logger?: Pick<Console, "warn" | "error">) {
  if (hasValidated) {
    return;
  }

  hasValidated = true;
  const output = logger ?? console;
  const result = validateServerEnv();

  for (const warning of result.warnings) {
    output.warn(`[env] ${warning.key}: ${warning.message}`);
  }

  if (!result.isValid) {
    for (const error of result.errors) {
      output.error(`[env] ${error.key}: ${error.message}`);
    }

    if (getNodeEnv() === "production") {
      const keys = result.errors.map((issue) => issue.key).join(", ");
      throw new Error(`Invalid server environment configuration. Missing or invalid keys: ${keys}`);
    }
  }
}
