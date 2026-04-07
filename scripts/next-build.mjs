#!/usr/bin/env node
import { spawn } from "node:child_process";

const BUILD_ENV_DEFAULTS = {
  BOOK_ENV_VALIDATION_CONTEXT: "build",
  DATABASE_URL: "postgresql://build:build@localhost:5432/book",
  AUTH_SECRET: "12345678901234567890123456789012",
  PAYMENT_GATEWAY_MODE: "live",
  PAYMENT_LIVE_PROVIDERS: "SHAM_CASH",
  SHAM_CASH_API_BASE_URL: "https://example.invalid/api/v1",
  SHAM_CASH_API_KEY: "build-placeholder",
  SHAM_CASH_DESTINATION_ACCOUNT: "000000",
  KV_REST_API_URL: "https://example.invalid/kv",
  KV_REST_API_TOKEN: "build-placeholder",
  BOOK_STORAGE_PROVIDER: "r2",
  BOOK_STORAGE_S3_ACCESS_KEY_ID: "build-placeholder",
  BOOK_STORAGE_S3_SECRET_ACCESS_KEY: "build-placeholder",
  BOOK_STORAGE_S3_PUBLIC_BUCKET: "build-bucket",
  NEXTAUTH_URL: "https://build.example",
  APP_BASE_URL: "https://build.example",
};

for (const [key, value] of Object.entries(BUILD_ENV_DEFAULTS)) {
  const current = process.env[key];
  if (typeof current !== "string" || current.trim().length === 0) {
    process.env[key] = value;
  }
}

const child = spawn("next", ["build"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
