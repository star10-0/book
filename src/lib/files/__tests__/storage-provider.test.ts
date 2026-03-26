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

test("s3 provider uploads/deletes and creates signed urls", async () => {
  const originals = {
    provider: process.env.BOOK_STORAGE_PROVIDER,
    accessKey: process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID,
    secret: process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY,
    bucket: process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET,
    privateBucket: process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET,
    region: process.env.BOOK_STORAGE_S3_REGION,
    endpoint: process.env.BOOK_STORAGE_S3_ENDPOINT,
    publicBaseUrl: process.env.BOOK_STORAGE_PUBLIC_BASE_URL,
    sessionToken: process.env.BOOK_STORAGE_S3_SESSION_TOKEN,
  };

  process.env.BOOK_STORAGE_PROVIDER = "s3";
  process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID = "test-access";
  process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY = "test-secret";
  process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET = "public-bucket";
  process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET = "private-bucket";
  process.env.BOOK_STORAGE_S3_REGION = "us-east-1";
  process.env.BOOK_STORAGE_S3_ENDPOINT = "https://s3.us-east-1.amazonaws.com";
  process.env.BOOK_STORAGE_PUBLIC_BASE_URL = "https://cdn.book.test";
  process.env.BOOK_STORAGE_S3_SESSION_TOKEN = "session-token";

  const requests: Array<{ method: string; url: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ method: init?.method ?? "GET", url: String(input) });
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  try {
    const provider = createStorageProvider("s3");
    const uploaded = await provider.uploadFile({
      bytes: new Uint8Array([1, 2, 3]),
      fileName: "chapter.pdf",
      fileSizeBytes: 3,
      folder: "books/book-1/pdf",
      mimeType: "application/pdf",
      visibility: "private",
    });

    assert.equal(uploaded.publicUrl, null);
    assert.equal(uploaded.pointer.bucket, "private-bucket");
    assert.match(uploaded.pointer.key, /^books\/book-1\/pdf\/.+\.pdf$/);

    const signedUrl = await provider.createSignedAssetUrl({
      pointer: {
        key: uploaded.pointer.key,
        bucket: uploaded.pointer.bucket,
      },
      fileName: "chapter.pdf",
      disposition: "inline",
      mimeType: "application/pdf",
    });

    assert.ok(signedUrl);
    assert.match(signedUrl ?? "", /^https:\/\/s3\.us-east-1\.amazonaws\.com\/private-bucket\/books/);
    assert.match(signedUrl ?? "", /X-Amz-Signature=/);

    await provider.deleteFile({
      key: uploaded.pointer.key,
      bucket: uploaded.pointer.bucket,
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.method, "PUT");
    assert.equal(requests[1]?.method, "DELETE");
  } finally {
    globalThis.fetch = originalFetch;

    if (typeof originals.provider === "string") process.env.BOOK_STORAGE_PROVIDER = originals.provider;
    else delete process.env.BOOK_STORAGE_PROVIDER;

    if (typeof originals.accessKey === "string") process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID = originals.accessKey;
    else delete process.env.BOOK_STORAGE_S3_ACCESS_KEY_ID;

    if (typeof originals.secret === "string") process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY = originals.secret;
    else delete process.env.BOOK_STORAGE_S3_SECRET_ACCESS_KEY;

    if (typeof originals.bucket === "string") process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET = originals.bucket;
    else delete process.env.BOOK_STORAGE_S3_PUBLIC_BUCKET;

    if (typeof originals.privateBucket === "string") process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET = originals.privateBucket;
    else delete process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET;

    if (typeof originals.region === "string") process.env.BOOK_STORAGE_S3_REGION = originals.region;
    else delete process.env.BOOK_STORAGE_S3_REGION;

    if (typeof originals.endpoint === "string") process.env.BOOK_STORAGE_S3_ENDPOINT = originals.endpoint;
    else delete process.env.BOOK_STORAGE_S3_ENDPOINT;

    if (typeof originals.publicBaseUrl === "string") process.env.BOOK_STORAGE_PUBLIC_BASE_URL = originals.publicBaseUrl;
    else delete process.env.BOOK_STORAGE_PUBLIC_BASE_URL;

    if (typeof originals.sessionToken === "string") process.env.BOOK_STORAGE_S3_SESSION_TOKEN = originals.sessionToken;
    else delete process.env.BOOK_STORAGE_S3_SESSION_TOKEN;
  }
});
