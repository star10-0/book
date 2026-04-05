import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authErrorMessages } from "@/lib/auth-error-messages";

test("authErrorMessages remain Arabic-first and non-empty", () => {
  for (const value of Object.values(authErrorMessages)) {
    assert.equal(typeof value, "string");
    assert.equal(value.trim().length > 0, true);
  }

  assert.equal(/[\u0600-\u06FF]/.test(authErrorMessages.invalidCredentials), true);
  assert.equal(/[\u0600-\u06FF]/.test(authErrorMessages.untrustedDevice), true);
});

test("auth actions use centralized auth error messages for consistency", () => {
  const source = readFileSync("src/app/auth/actions.ts", "utf8");
  assert.equal(source.includes('import { authErrorMessages } from "@/lib/auth-error-messages";'), true);
  assert.equal(source.includes("authErrorMessages.invalidCredentials"), true);
  assert.equal(source.includes("authErrorMessages.requiredFields"), true);
});
