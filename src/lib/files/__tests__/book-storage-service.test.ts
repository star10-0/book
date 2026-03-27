import assert from "node:assert/strict";
import test from "node:test";
import { FileKind } from "@prisma/client";
import {
  BookStorageService,
  getAssetVisibility,
  mapStorageProviderEnumToKey,
  mapStorageProviderKeyToEnum,
} from "@/lib/files/book-storage-service";
import type { BookAssetPointer, StorageProviderAdapter, StoredUpload } from "@/lib/files/storage-provider";

test("book storage service uses public visibility for covers and private for reading assets", async () => {
  const calls: Array<{ visibility?: "public" | "private"; folder: string }> = [];

  const provider: StorageProviderAdapter = {
    key: "local",
    async uploadFile(input): Promise<StoredUpload> {
      calls.push({ visibility: input.visibility, folder: input.folder });
      return {
        pointer: { key: `${input.folder}/file` },
        publicUrl: input.visibility === "public" ? "/uploads/file" : null,
      };
    },
    async deleteFile(_pointer: BookAssetPointer) {
      void _pointer;
    },
    resolvePublicUrl() {
      return null;
    },
    async createSignedAssetUrl() {
      return null;
    },
  };

  const service = new BookStorageService(provider);

  await service.uploadBookAsset({
    bookId: "book-1",
    kind: FileKind.COVER_IMAGE,
    bytes: new Uint8Array([1]),
    fileName: "cover.jpg",
    fileSizeBytes: 1,
    mimeType: "image/jpeg",
  });

  await service.uploadBookAsset({
    bookId: "book-1",
    kind: FileKind.PDF,
    bytes: new Uint8Array([1]),
    fileName: "book.pdf",
    fileSizeBytes: 1,
    mimeType: "application/pdf",
  });

  assert.equal(calls[0]?.visibility, "public");
  assert.equal(calls[1]?.visibility, "private");
  assert.equal(calls[0]?.folder, "books/book-1/cover_image");
  assert.equal(calls[1]?.folder, "books/book-1/pdf");
});

test("storage provider mapping and visibility helpers are stable", () => {
  assert.equal(getAssetVisibility(FileKind.COVER_IMAGE), "public");
  assert.equal(getAssetVisibility(FileKind.EPUB), "protected");
  assert.equal(mapStorageProviderKeyToEnum("local"), "LOCAL");
  assert.equal(mapStorageProviderKeyToEnum("s3"), "S3");
  assert.equal(mapStorageProviderKeyToEnum("r2"), "CLOUDFLARE_R2");
  assert.equal(mapStorageProviderEnumToKey("LOCAL"), "local");
  assert.equal(mapStorageProviderEnumToKey("S3"), "s3");
  assert.equal(mapStorageProviderEnumToKey("CLOUDFLARE_R2"), "r2");
});
