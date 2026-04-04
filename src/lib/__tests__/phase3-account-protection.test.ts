import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildPolicyAcceptanceUpdate, hasAcceptedCurrentDevicePolicy } from "@/lib/policy";

test("policy acceptance persists terms version and timestamp", () => {
  const now = new Date("2026-04-04T12:00:00.000Z");
  const update = buildPolicyAcceptanceUpdate(now);

  assert.equal(typeof update.acceptedTermsVersion, "string");
  assert.equal(update.acceptedDevicePolicyAt.toISOString(), now.toISOString());
  assert.equal(hasAcceptedCurrentDevicePolicy(update), true);
});

test("policy acceptance requires both current terms version and acceptance timestamp", () => {
  const now = new Date("2026-04-04T12:00:00.000Z");

  assert.equal(
    hasAcceptedCurrentDevicePolicy({
      acceptedTermsVersion: "2026-04",
      acceptedDevicePolicyAt: null,
    }),
    false,
  );
  assert.equal(
    hasAcceptedCurrentDevicePolicy({
      acceptedTermsVersion: "2026-03",
      acceptedDevicePolicyAt: now,
    }),
    false,
  );
});

test("admin user details page exposes trusted device controls and suspicious attempts", () => {
  const source = readFileSync("src/app/admin/users/[userId]/page.tsx", "utf8");

  assert.equal(source.includes("فرض إعادة ربط الجهاز"), true);
  assert.equal(source.includes("محاولات مشبوهة (أجهزة غير موثوقة)"), true);
  assert.equal(source.includes('suspiciousSecurityEventTypes'), true);
});

test("signin flow keeps banned users blocked", () => {
  const source = readFileSync("src/app/auth/actions.ts", "utf8");
  assert.equal(source.includes("!user || !user.passwordHash || !user.isActive"), true);
});
