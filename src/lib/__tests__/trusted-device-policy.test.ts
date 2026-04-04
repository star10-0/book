import assert from "node:assert/strict";
import test from "node:test";
import { buildTrustedDeviceRevocationData, classifyTrustedDeviceLogin, inferDeviceLabel } from "@/lib/trusted-device";

test("first successful login with no trusted device registers primary device", () => {
  const result = classifyTrustedDeviceLogin({ activeTokenHashes: [], currentTokenHash: "hash-a" });
  assert.equal(result.decision, "register_primary");
});

test("login from same trusted device is allowed", () => {
  const result = classifyTrustedDeviceLogin({ activeTokenHashes: ["hash-a"], currentTokenHash: "hash-a" });
  assert.equal(result.decision, "allow_existing");
});

test("login from different device is blocked", () => {
  const result = classifyTrustedDeviceLogin({ activeTokenHashes: ["hash-a"], currentTokenHash: "hash-b" });
  assert.equal(result.decision, "block_untrusted");
});

test("trusted device revocation marks device as revoked and untrusted", () => {
  const now = new Date("2026-04-04T00:00:00.000Z");
  const result = buildTrustedDeviceRevocationData(now);
  assert.equal(result.revokedAt.toISOString(), now.toISOString());
  assert.equal(result.isTrusted, false);
  assert.equal(result.isPrimary, false);
});

test("device label is inferred from user-agent without trusting user-agent alone", () => {
  assert.equal(inferDeviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "iPhone");
  assert.equal(inferDeviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "Windows");
  assert.equal(inferDeviceLabel(undefined), "جهاز موثوق");
});
