import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const FORBIDDEN_IMPORTS = [
  "@/lib/env",
  "@/lib/auth-session",
  "@/lib/security/rate-limit",
  "@/lib/security/content-protection",
  "@/lib/files/storage-provider",
  "@/lib/metrics-auth",
  "@/lib/payments/gateways/provider-http",
  "@/lib/payments/gateways/sham-cash-gateway",
  "@/lib/payments/gateways/syriatel-cash-gateway",
  "@/lib/payments/gateways/sham-cash-callback",
  "@/lib/observability/logger",
  "@/lib/observability/redaction",
];

test("client components do not import server-only secret modules", async () => {
  const files = glob("src/**/*.{ts,tsx}");
  const violations: string[] = [];

  for await (const file of files) {
    const source = await readFile(file, "utf8");
    const normalized = source.trimStart();

    if (!normalized.startsWith('"use client"') && !normalized.startsWith("'use client'")) {
      continue;
    }

    for (const importPath of FORBIDDEN_IMPORTS) {
      const importToken = `from \"${importPath}\"`;
      if (source.includes(importToken)) {
        violations.push(`${path.relative(process.cwd(), file)} imports ${importPath}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
