import assert from "node:assert/strict";
import test from "node:test";
import { ContentAccessPolicy, FileKind } from "@prisma/client";
import { resolveBookContentAccess } from "@/lib/book-content-access";

test("resolveBookContentAccess enables public read/download by policy", () => {
  const result = resolveBookContentAccess({
    policy: ContentAccessPolicy.PUBLIC_DOWNLOAD,
    textContent: null,
    files: [{ id: "f-1", kind: FileKind.PDF, publicUrl: "/files/book.pdf" }],
  });

  assert.equal(result.canReadPublicly, true);
  assert.equal(result.canDownloadPublicly, true);
});

test("resolveBookContentAccess blocks public reading for private content", () => {
  const result = resolveBookContentAccess({
    policy: ContentAccessPolicy.PAID_ONLY,
    textContent: "private chapter",
    files: [],
  });

  assert.equal(result.canReadPublicly, false);
  assert.equal(result.canDownloadPublicly, false);
});

test("resolveBookContentAccess allows preview-only reading when text exists", () => {
  const withText = resolveBookContentAccess({
    policy: ContentAccessPolicy.PREVIEW_ONLY,
    textContent: "preview",
    files: [],
  });
  const withoutText = resolveBookContentAccess({
    policy: ContentAccessPolicy.PREVIEW_ONLY,
    textContent: " ",
    files: [],
  });

  assert.equal(withText.canReadPreview, true);
  assert.equal(withoutText.canReadPreview, false);
});
