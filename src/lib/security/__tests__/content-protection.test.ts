import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProtectedAssetUrl,
  buildWatermarkText,
  createProtectedAssetToken,
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

test("buildProtectedAssetUrl generates signed short-lived URLs", () => withAuthSecret(() => {
  const url = buildProtectedAssetUrl({ fileId: "file-1", disposition: "inline", userId: "user-1" });
  assert.equal(url.startsWith("/api/books/assets/file-1?t="), true);
}));

test("watermark text links content to user context", () => {
  const watermark = buildWatermarkText({
    email: "reader@example.com",
    userId: "u1",
    orderId: "o1",
    accessGrantId: "g1",
  });

  assert.equal(Boolean(watermark?.includes("reader@example.com")), true);
  assert.equal(Boolean(watermark?.includes("o1")), true);
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
