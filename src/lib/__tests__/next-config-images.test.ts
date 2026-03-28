import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../../next.config";

test("next config allows QR server in CSP img-src", async () => {
  const headers = await nextConfig.headers?.();
  const globalHeaders = headers?.find((entry) => entry.source === "/:path*")?.headers ?? [];
  const csp = globalHeaders.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

  assert.match(csp, /img-src[^;]*https:\/\/api\.qrserver\.com/i);
});

test("next image remote patterns include placehold, unsplash, and qrserver hosts", () => {
  const remotePatterns = nextConfig.images?.remotePatterns ?? [];

  assert.equal(remotePatterns.some((pattern) => pattern.hostname === "placehold.co"), true);
  assert.equal(remotePatterns.some((pattern) => pattern.hostname === "images.unsplash.com"), true);
  assert.equal(remotePatterns.some((pattern) => pattern.hostname === "api.qrserver.com"), true);
});
