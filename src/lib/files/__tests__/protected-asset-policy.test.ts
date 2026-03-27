import assert from "node:assert/strict";
import test from "node:test";
import { ContentAccessPolicy } from "@prisma/client";
import { canAccessProtectedAsset } from "@/lib/files/protected-asset-policy";

test("public read allows inline only", () => {
  assert.deepEqual(
    canAccessProtectedAsset({
      policy: ContentAccessPolicy.PUBLIC_READ,
      hasActiveGrant: false,
      requestedDisposition: "inline",
    }),
    { allowed: true, disposition: "inline" },
  );

  assert.deepEqual(
    canAccessProtectedAsset({
      policy: ContentAccessPolicy.PUBLIC_READ,
      hasActiveGrant: false,
      requestedDisposition: "attachment",
    }),
    { allowed: false, reason: "DOWNLOAD_NOT_ALLOWED" },
  );
});

test("public download allows attachments", () => {
  assert.deepEqual(
    canAccessProtectedAsset({
      policy: ContentAccessPolicy.PUBLIC_DOWNLOAD,
      hasActiveGrant: false,
      requestedDisposition: "attachment",
    }),
    { allowed: true, disposition: "attachment" },
  );
});

test("active grant allows read/download even in paid mode", () => {
  assert.deepEqual(
    canAccessProtectedAsset({
      policy: ContentAccessPolicy.PAID_ONLY,
      hasActiveGrant: true,
      requestedDisposition: "attachment",
    }),
    { allowed: true, disposition: "attachment" },
  );
});

test("paid without grant is denied", () => {
  assert.deepEqual(
    canAccessProtectedAsset({
      policy: ContentAccessPolicy.PAID_ONLY,
      hasActiveGrant: false,
      requestedDisposition: "inline",
    }),
    { allowed: false, reason: "UNAUTHORIZED" },
  );
});
