import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProtectedAssetUrl,
  buildWatermarkText,
  createOpaqueHandle,
  getProtectedAssetHandoffTicketCookieName,
  getProtectedAssetSessionAssetsCookieName,
  getProtectedAssetSessionEpubCookieName,
  hashOpaqueHandle,
  resolveOpaqueHandleFromRequest,
} from "@/lib/security/content-protection";

test("buildProtectedAssetUrl uses handoff endpoint without exposing token in query params", () => {
  const url = buildProtectedAssetUrl({ fileId: "file-1", disposition: "inline", userId: "user-1" });
  assert.equal(url, "/api/books/assets/file-1/handoff");
});

test("resolveOpaqueHandleFromRequest ignores query token and reads only bearer/cookie", () => {
  const request = new Request("https://book.example/api/books/assets/file-1?t=query-token");
  assert.equal(resolveOpaqueHandleFromRequest(request, "session-assets"), null);
});

test("resolveOpaqueHandleFromRequest prefers Authorization bearer over cookies", () => {
  const request = new Request("https://book.example/api/books/assets/file-1", {
    headers: {
      authorization: "Bearer bearer-token",
      cookie: `${getProtectedAssetSessionAssetsCookieName()}=cookie-token; ${getProtectedAssetHandoffTicketCookieName()}=handoff-ticket`,
    },
  });

  assert.equal(resolveOpaqueHandleFromRequest(request, "session-assets"), "bearer-token");
  assert.equal(resolveOpaqueHandleFromRequest(request, "handoff"), "bearer-token");
});

test("session cookie names are split by path scope", () => {
  assert.notEqual(getProtectedAssetSessionAssetsCookieName(), getProtectedAssetSessionEpubCookieName());
});

test("opaque handles are random and hashed server-side", () => {
  const one = createOpaqueHandle();
  const two = createOpaqueHandle();

  assert.notEqual(one, two);
  assert.equal(one.includes("."), false);
  assert.equal(hashOpaqueHandle(one).length, 64);
});

test("watermark text is opaque and does not expose direct identifiers", () => {
  const watermark = buildWatermarkText({
    email: "reader@example.com",
    userId: "u1",
    orderId: "o1",
    accessGrantId: "g1",
  });

  assert.equal(Boolean(watermark?.startsWith("book|wm-v1|")), true);
  assert.equal(Boolean(watermark?.includes("reader@example.com")), false);
  assert.equal(Boolean(watermark?.includes("o1")), false);
});
