import assert from "node:assert/strict";
import test from "node:test";
import { createStorageProvider, resolveStorageProviderFromEnv } from "@/lib/files/storage-provider";

test("resolveStorageProviderFromEnv falls back to local", () => {
  const original = process.env.BOOK_STORAGE_PROVIDER;
  delete process.env.BOOK_STORAGE_PROVIDER;

  assert.equal(resolveStorageProviderFromEnv(), "local");

  process.env.BOOK_STORAGE_PROVIDER = "S3";
  assert.equal(resolveStorageProviderFromEnv(), "s3");

  if (typeof original === "string") {
    process.env.BOOK_STORAGE_PROVIDER = original;
  } else {
    delete process.env.BOOK_STORAGE_PROVIDER;
  }
});

test("local provider cannot create signed asset urls", async () => {
  const original = process.env.BOOK_STORAGE_PROVIDER;
  process.env.BOOK_STORAGE_PROVIDER = "local";

  const provider = createStorageProvider();
  const signed = await provider.createSignedAssetUrl({
    pointer: { key: "books/book/pdf/file.pdf" },
    fileName: "file.pdf",
    disposition: "inline",
  });

  assert.equal(signed, null);

  if (typeof original === "string") {
    process.env.BOOK_STORAGE_PROVIDER = original;
  } else {
    delete process.env.BOOK_STORAGE_PROVIDER;
  }
});

test("s3 provider requires storage credentials", () => {
  const originals = {
    provider: process.env.BOOK_STORAGE_PROVIDER,
    accessKey: process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID,
    secret: process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY,
    bucket: process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET,
  };

  process.env.BOOK_STORAGE_PROVIDER = "s3";
  delete process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;
  delete process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;
  delete process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;

  assert.throws(() => createStorageProvider(), /BOOK_STORAGE_S3_(PUBLIC_BUCKET|ACCESS_KEY_ID)/);

  if (typeof originals.provider === "string") process.env.BOOK_STORAGE_PROVIDER = originals.provider;
  else delete process.env.BOOK_STORAGE_PROVIDER;

  if (typeof originals.accessKey === "string") process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID = originals.accessKey;
  else delete process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;

  if (typeof originals.secret === "string") process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY = originals.secret;
  else delete process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;

  if (typeof originals.bucket === "string") process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET = originals.bucket;
  else delete process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;
});
