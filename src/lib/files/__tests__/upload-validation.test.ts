import assert from "node:assert/strict";
import test from "node:test";
import { FileKind } from "@prisma/client";
import { detectMimeBySignature, validateFileSignature, validateUploadPayload, validateUploadSize } from "@/lib/files/upload-validation";

test("validateUploadSize rejects empty and oversized uploads", () => {
  assert.equal(validateUploadSize(FileKind.PDF, 0).ok, false);
  assert.equal(validateUploadSize(FileKind.PDF, 50 * 1024 * 1024).ok, true);
  assert.equal(validateUploadSize(FileKind.PDF, 50 * 1024 * 1024 + 1).ok, false);
});

test("validateFileSignature validates PDF and EPUB signatures", () => {
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  assert.equal(validateFileSignature(FileKind.PDF, "book.pdf", pdfBytes), true);
  assert.equal(validateFileSignature(FileKind.PDF, "book.pdf", new Uint8Array([0x50, 0x4b, 0x03, 0x04])), false);

  const epubBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...new TextEncoder().encode("application/epub+zip")]);
  assert.equal(validateFileSignature(FileKind.EPUB, "book.epub", epubBytes), true);
  assert.equal(validateFileSignature(FileKind.EPUB, "book.epub", new Uint8Array([0x50, 0x4b, 0x03, 0x04])), false);
});

test("validateUploadPayload detects MIME/signature mismatch and spoofed uploads", () => {
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

  assert.equal(detectMimeBySignature(pdfBytes), "application/pdf");

  const valid = validateUploadPayload({
    kind: FileKind.PDF,
    fileName: "book.pdf",
    mimeType: "application/pdf",
    sizeBytes: pdfBytes.length,
    bytes: pdfBytes,
  });

  assert.equal(valid.ok, true);

  const spoofed = validateUploadPayload({
    kind: FileKind.PDF,
    fileName: "book.pdf",
    mimeType: "application/pdf",
    sizeBytes: 6,
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x11, 0x22]),
  });

  assert.equal(spoofed.ok, false);
  assert.equal(spoofed.code, "INVALID_SIGNATURE");

  const mismatchedMime = validateUploadPayload({
    kind: FileKind.COVER_IMAGE,
    fileName: "cover.jpg",
    mimeType: "image/jpeg",
    sizeBytes: pdfBytes.length,
    bytes: pdfBytes,
  });

  assert.equal(mismatchedMime.ok, false);
  assert.equal(mismatchedMime.code, "INVALID_SIGNATURE");
});
