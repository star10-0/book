import type { PaymentProvider } from "@prisma/client";

const GATEWAY_MODE_ENV = "PAYMENT_GATEWAY_MODE";

export type GatewayExecutionMode = "mock" | "live";
export type SupportedLiveProvider = "SHAM_CASH" | "SYRIATEL_CASH";
const LIVE_PROVIDERS_ENV = "PAYMENT_LIVE_PROVIDERS";
const SUPPORTED_LIVE_PROVIDERS: readonly SupportedLiveProvider[] = ["SHAM_CASH", "SYRIATEL_CASH"];

export interface ProviderIntegrationConfig {
  provider: SupportedLiveProvider;
  code: "sham_cash" | "syriatel_cash";
  mode: GatewayExecutionMode;
  isLiveConfigured: boolean;
  missingEnvKeys: string[];
}

export interface LiveProviderSelectionResult {
  selectedProviders: SupportedLiveProvider[];
  invalidProviders: string[];
  source: "default" | "env";
}

const LIVE_PROVIDER_REQUIRED_ENV: Record<SupportedLiveProvider, readonly string[]> = {
  SHAM_CASH: ["SHAM_CASH_API_BASE_URL", "SHAM_CASH_API_KEY", "SHAM_CASH_DESTINATION_ACCOUNT"],
  SYRIATEL_CASH: [
    "SYRIATEL_CASH_API_BASE_URL",
    "SYRIATEL_CASH_API_KEY",
    "SYRIATEL_CASH_MERCHANT_ID",
    "SYRIATEL_CASH_DESTINATION_ACCOUNT",
    "SYRIATEL_CASH_CREATE_PAYMENT_PATH",
    "SYRIATEL_CASH_VERIFY_PAYMENT_PATH",
  ],
};

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

function isSupportedLiveProvider(value: string): value is SupportedLiveProvider {
  return (SUPPORTED_LIVE_PROVIDERS as readonly string[]).includes(value);
}

export function getLiveProvidersEnvKey(): string {
  return LIVE_PROVIDERS_ENV;
}

export function getSupportedLiveProviders(): readonly SupportedLiveProvider[] {
  return SUPPORTED_LIVE_PROVIDERS;
}

export function parseSelectedLiveProviders(): LiveProviderSelectionResult {
  const rawValue = process.env[LIVE_PROVIDERS_ENV]?.trim();

  if (!rawValue) {
    return {
      selectedProviders: [...SUPPORTED_LIVE_PROVIDERS],
      invalidProviders: [],
      source: "default",
    };
  }

  const values = rawValue
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^['"]|['"]$/g, "").toUpperCase())
    .filter(Boolean);

  const selectedProviders: SupportedLiveProvider[] = [];
  const invalidProviders: string[] = [];

  for (const value of values) {
    if (isSupportedLiveProvider(value)) {
      if (!selectedProviders.includes(value)) {
        selectedProviders.push(value);
      }
      continue;
    }

    invalidProviders.push(value);
  }

  return {
    selectedProviders,
    invalidProviders,
    source: "env",
  };
}

export function getRequiredLiveEnvKeys(provider: SupportedLiveProvider): readonly string[] {
  return LIVE_PROVIDER_REQUIRED_ENV[provider];
}

export function getMissingLiveEnvKeys(provider: SupportedLiveProvider): string[] {
  return getRequiredLiveEnvKeys(provider).filter((key) => !hasEnv(key));
}

export function getProviderIntegrationConfig(provider: PaymentProvider): ProviderIntegrationConfig | null {
  if (provider === "SHAM_CASH") {
    return getShamCashIntegrationConfig();
  }

  if (provider === "SYRIATEL_CASH") {
    return getSyriatelCashIntegrationConfig();
  }

  return null;
}

export function getShamCashIntegrationConfig(): ProviderIntegrationConfig {
  const missingEnvKeys = getMissingLiveEnvKeys("SHAM_CASH");

  return {
    provider: "SHAM_CASH",
    code: "sham_cash",
    mode: readMode(),
    isLiveConfigured: missingEnvKeys.length === 0,
    missingEnvKeys,
  };
}

export function getSyriatelCashIntegrationConfig(): ProviderIntegrationConfig {
  const missingEnvKeys = getMissingLiveEnvKeys("SYRIATEL_CASH");

  return {
    provider: "SYRIATEL_CASH",
    code: "syriatel_cash",
    mode: readMode(),
    isLiveConfigured: missingEnvKeys.length === 0,
    missingEnvKeys,
  };
}
