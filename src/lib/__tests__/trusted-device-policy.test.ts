import assert from "node:assert/strict";
import test from "node:test";
import { classifyTrustedDeviceLogin } from "@/lib/trusted-device";

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
