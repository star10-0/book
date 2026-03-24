type RuntimeEnvironment = "development" | "test" | "production";

type EnvSeverity = "error" | "warning";

type EnvIssue = {
  severity: EnvSeverity;
  key: string;
  message: string;
};

let hasValidated = false;

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

  const paymentMode = (readEnv("PAYMENT_GATEWAY_MODE") ?? "mock").toLowerCase();
  if (paymentMode !== "mock" && paymentMode !== "live") {
    issues.push({
      severity: "warning",
      key: "PAYMENT_GATEWAY_MODE",
      message: "PAYMENT_GATEWAY_MODE should be either 'mock' or 'live'. Falling back to mock.",
    });
  }

  const storageProvider = (readEnv("BOOK_STORAGE_PROVIDER") ?? "local").toLowerCase();
  if (!["local", "s3", "r2"].includes(storageProvider)) {
    issues.push({
      severity: "warning",
      key: "BOOK_STORAGE_PROVIDER",
      message: "BOOK_STORAGE_PROVIDER should be one of: local, s3, r2. Falling back to local.",
    });
  }

  if (nodeEnv === "production" && storageProvider === "local") {
    issues.push({
      severity: "warning",
      key: "BOOK_STORAGE_PROVIDER",
      message: "Using local storage in production can lose files on ephemeral hosts. Prefer object storage.",
    });
  }

  const nextAuthUrl = readEnv("NEXTAUTH_URL");
  if (nodeEnv === "production" && !nextAuthUrl) {
    issues.push({
      severity: "warning",
      key: "NEXTAUTH_URL",
      message: "NEXTAUTH_URL is recommended in production for consistent callback/origin behavior.",
    });
  }

  const appBaseUrl = readEnv("APP_BASE_URL");
  if (appBaseUrl) {
    try {
      new URL(appBaseUrl);
    } catch {
      issues.push({
        severity: "warning",
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
    const details = result.errors.map((issue) => `${issue.key}: ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment configuration. ${details}`);
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
  }
}
