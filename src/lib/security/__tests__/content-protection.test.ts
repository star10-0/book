import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProtectedAssetUrl,
  buildWatermarkText,
  createProtectedAssetToken,
  getProtectedAssetNonceCookieName,
  getProtectedAssetTokenCookieName,
  resolveProtectedAssetNonce,
  resolveProtectedAssetToken,
  verifyProtectedAssetToken,
} from "@/lib/security/content-protection";

function withAuthSecret(run: () => void) {
  const original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-auth-secret";
  try {
    run();
  } finally {
    if (typeof original === "string") {
      process.env.AUTH_SECRET = original;
    } else {
      delete process.env.AUTH_SECRET;
    }
  }
}

test("protected asset token validates for the same file/user/disposition", () => withAuthSecret(() => {
  const token = createProtectedAssetToken({
    fileId: "file-1",
    disposition: "inline",
    userId: "user-1",
    expiresInSeconds: 120,
  });

  const result = verifyProtectedAssetToken({
    token,
    fileId: "file-1",
    disposition: "inline",
    currentUserId: "user-1",
  });

  assert.equal(result.valid, true);
}));

test("protected asset token is rejected for a different user", () => withAuthSecret(() => {
  const token = createProtectedAssetToken({
    fileId: "file-1",
    disposition: "inline",
    userId: "user-1",
    expiresInSeconds: 120,
  });

  const result = verifyProtectedAssetToken({
    token,
    fileId: "file-1",
    disposition: "inline",
    currentUserId: "user-2",
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.reason, "WRONG_USER");
  }
}));

test("buildProtectedAssetUrl uses handoff endpoint without exposing token in query params", () => withAuthSecret(() => {
  const url = buildProtectedAssetUrl({ fileId: "file-1", disposition: "inline", userId: "user-1" });
  assert.equal(url, "/api/books/assets/file-1/handoff");
}));

test("resolveProtectedAssetToken ignores query token and reads only bearer/cookie", () => {
  const request = new Request("https://book.example/api/books/assets/file-1?t=query-token");
  assert.equal(resolveProtectedAssetToken(request), null);
});

test("resolveProtectedAssetToken prefers Authorization bearer over cookies", () => {
  const request = new Request("https://book.example/api/books/assets/file-1", {
    headers: {
      authorization: "Bearer bearer-token",
      cookie: `${getProtectedAssetTokenCookieName()}=cookie-token; ${getProtectedAssetNonceCookieName()}=nonce-1`,
    },
  });
  assert.equal(resolveProtectedAssetToken(request), "bearer-token");
  assert.equal(resolveProtectedAssetNonce(request), "nonce-1");
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


test("protected token verification fails safely when AUTH_SECRET is unset", () => {
  const original = process.env.AUTH_SECRET;
  delete process.env.AUTH_SECRET;

  const result = verifyProtectedAssetToken({
    token: "invalid.token",
    fileId: "file-1",
    disposition: "inline",
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.reason, "SIGNING_SECRET_UNSET");
  }

  if (typeof original === "string") {
    process.env.AUTH_SECRET = original;
  }
});

test("protected token verification rejects nonce mismatch", () => withAuthSecret(() => {
  const token = createProtectedAssetToken({
    fileId: "file-1",
    disposition: "inline",
    userId: "user-1",
    expiresInSeconds: 120,
  });

  const mismatchResult = verifyProtectedAssetToken({
    token,
    fileId: "file-1",
    disposition: "inline",
    currentUserId: "user-1",
    expectedNonce: "wrong-nonce",
  });

  assert.equal(mismatchResult.valid, false);
  if (!mismatchResult.valid) {
    assert.equal(mismatchResult.reason, "NONCE_MISMATCH");
  }
}));

test("protected token verification rejects session mismatch", () => withAuthSecret(() => {
  const token = createProtectedAssetToken({
    fileId: "file-1",
    disposition: "inline",
    userId: "user-1",
    readingSessionId: "session-1",
    expiresInSeconds: 120,
  });

  const mismatchResult = verifyProtectedAssetToken({
    token,
    fileId: "file-1",
    disposition: "inline",
    currentUserId: "user-1",
    expectedSessionId: "session-2",
  });

  assert.equal(mismatchResult.valid, false);
  if (!mismatchResult.valid) {
    assert.equal(mismatchResult.reason, "SESSION_MISMATCH");
  }
}));


test("createProtectedAssetToken throws when AUTH_SECRET is unset", () => {
  const original = process.env.AUTH_SECRET;
  delete process.env.AUTH_SECRET;

  assert.throws(() => {
    createProtectedAssetToken({ fileId: "file-1", disposition: "inline" });
  }, /AUTH_SECRET is required/);

  if (typeof original === "string") {
    process.env.AUTH_SECRET = original;
  }
});
