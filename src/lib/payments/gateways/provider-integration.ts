import type { PaymentProvider } from "@prisma/client";

const GATEWAY_MODE_ENV = "PAYMENT_GATEWAY_MODE";

export type GatewayExecutionMode = "mock" | "live";

export interface ProviderIntegrationConfig {
  provider: PaymentProvider;
  code: "sham_cash" | "syriatel_cash";
  mode: GatewayExecutionMode;
  isLiveConfigured: boolean;
}

function readMode(): GatewayExecutionMode {
  const rawMode = process.env[GATEWAY_MODE_ENV]?.trim().toLowerCase();

  if (!rawMode || rawMode === "mock") {
    return "mock";
  }

  if (rawMode === "live") {
    return "live";
  }

  return "mock";
}

function hasEnv(name: string) {
  return typeof process.env[name] === "string" && process.env[name]!.trim().length > 0;
}

export function getShamCashIntegrationConfig(): ProviderIntegrationConfig {
  return {
    provider: "SHAM_CASH",
    code: "sham_cash",
    mode: readMode(),
    isLiveConfigured:
      hasEnv("SHAM_CASH_API_BASE_URL") &&
      hasEnv("SHAM_CASH_API_KEY") &&
      hasEnv("SHAM_CASH_MERCHANT_ID") &&
      hasEnv("SHAM_CASH_DESTINATION_ACCOUNT") &&
      hasEnv("SHAM_CASH_CREATE_PAYMENT_PATH") &&
      hasEnv("SHAM_CASH_VERIFY_PAYMENT_PATH") &&
      hasEnv("SHAM_CASH_WEBHOOK_SECRET"),
  };
}

export function getSyriatelCashIntegrationConfig(): ProviderIntegrationConfig {
  return {
    provider: "SYRIATEL_CASH",
    code: "syriatel_cash",
    mode: readMode(),
    isLiveConfigured:
      hasEnv("SYRIATEL_CASH_API_BASE_URL") &&
      hasEnv("SYRIATEL_CASH_API_KEY") &&
      hasEnv("SYRIATEL_CASH_MERCHANT_ID") &&
      hasEnv("SYRIATEL_CASH_DESTINATION_ACCOUNT") &&
      hasEnv("SYRIATEL_CASH_CREATE_PAYMENT_PATH") &&
      hasEnv("SYRIATEL_CASH_VERIFY_PAYMENT_PATH"),
  };
}
