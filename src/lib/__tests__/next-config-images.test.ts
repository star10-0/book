import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../../next.config";
import { buildContentSecurityPolicy } from "../security/csp";

test("CSP img-src allows QR server", () => {
  const csp = buildContentSecurityPolicy({ isDevelopment: false, nonce: "abc123" });

  assert.match(csp, /img-src[^;]*https:\/\/api\.qrserver\.com/i);
});

test("production CSP script-src does not require unsafe-inline", () => {
  const csp = buildContentSecurityPolicy({ isDevelopment: false, nonce: "abc123" });

  assert.match(csp, /script-src[^;]*'nonce-abc123'/i);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/i);
});

test("next image remote patterns include placehold, unsplash, and qrserver hosts", () => {
  const remotePatterns = nextConfig.images?.remotePatterns ?? [];

  assert.equal(remotePatterns.some((pattern) => pattern.hostname === "placehold.co"), true);
  assert.equal(remotePatterns.some((pattern) => pattern.hostname === "images.unsplash.com"), true);
  assert.equal(remotePatterns.some((pattern) => pattern.hostname === "api.qrserver.com"), true);
});
