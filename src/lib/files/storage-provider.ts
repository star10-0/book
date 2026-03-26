import { createHash, createHmac, randomUUID } from "node:crypto";
import path from "node:path";

export const STORAGE_PROVIDER_KEYS = ["local", "s3", "r2"] as const;

export type StorageProviderKey = (typeof STORAGE_PROVIDER_KEYS)[number];

export type BookAssetPointer = {
  key: string;
  bucket?: string;
  region?: string;
  publicUrl?: string;
};

export type StorageUploadRequest = {
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
};

export type StorageUploadInput = StorageUploadRequest & {
  bytes: Uint8Array;
  folder: string;
  visibility?: "public" | "private";
};

export type StoredUpload = {
  pointer: BookAssetPointer;
  publicUrl: string | null;
};

export type SignedAssetUrlInput = {
  pointer: BookAssetPointer;
  fileName: string;
  disposition: "inline" | "attachment";
  mimeType?: string | null;
  expiresInSeconds?: number;
};

export interface StorageProviderAdapter {
  readonly key: StorageProviderKey;
  uploadFile(input: StorageUploadInput): Promise<StoredUpload>;
  deleteFile(pointer: BookAssetPointer): Promise<void>;
  resolvePublicUrl(pointer: BookAssetPointer): string | null;
  createSignedAssetUrl(input: SignedAssetUrlInput): Promise<string | null>;
}

class LocalStorageProvider implements StorageProviderAdapter {
  readonly key = "local" as const;

  async uploadFile(input: StorageUploadInput): Promise<StoredUpload> {
    const { writeFile, mkdir } = await import("node:fs/promises");

    const extension = path.extname(input.fileName).toLowerCase();
    const key = path.posix.join(input.folder, `${randomUUID()}${extension}`);
    const visibility = input.visibility ?? "private";
    const isPublic = visibility === "public";
    const baseDirectory = isPublic ? path.join(process.cwd(), "public", "uploads") : path.join(process.cwd(), "storage", "private", "uploads");
    const absolutePath = path.join(baseDirectory, key);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes);

    const publicUrl = isPublic ? `/uploads/${key}` : null;

    return {
      pointer: {
        key,
        publicUrl: publicUrl ?? undefined,
      },
      publicUrl,
    };
  }

  async deleteFile(pointer: BookAssetPointer): Promise<void> {
    const { rm } = await import("node:fs/promises");
    const publicAbsolutePath = path.join(process.cwd(), "public", "uploads", pointer.key);
    const privateAbsolutePath = path.join(process.cwd(), "storage", "private", "uploads", pointer.key);

    await rm(publicAbsolutePath, { force: true });
    await rm(privateAbsolutePath, { force: true });
  }

  resolvePublicUrl(pointer: BookAssetPointer): string | null {
    return pointer.publicUrl ?? null;
  }

  async createSignedAssetUrl(): Promise<string | null> {
    return null;
  }
}

class S3CompatibleStorageProvider implements StorageProviderAdapter {
  readonly key: Extract<StorageProviderKey, "s3" | "r2">;

  private readonly publicBucket: string;
  private readonly privateBucket: string;
  private readonly region: string;
  private readonly publicBaseUrl: string | null;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken: string | null;
  private readonly signedUrlExpirySeconds: number;
  private readonly endpoint: URL;

  constructor(key: Extract<StorageProviderKey, "s3" | "r2">) {
    this.key = key;
    this.publicBucket = readRequiredEnv("BOOK_STORAGE_S3_PUBLIC_BUCKET");
    this.privateBucket = process.env.BOOK_STORAGE_S3_PRIVATE_BUCKET?.trim() || this.publicBucket;
    this.region = process.env.BOOK_STORAGE_S3_REGION?.trim() || "us-east-1";
    this.publicBaseUrl = process.env.BOOK_STORAGE_PUBLIC_BASE_URL?.trim() || null;
    this.signedUrlExpirySeconds = resolveSignedUrlExpiry(process.env.BOOK_STORAGE_SIGNED_URL_EXPIRY_SECONDS);

    this.accessKeyId = readRequiredEnv("BOOK_STORAGE_S3_ACCESS_KEY_ID");
    this.secretAccessKey = readRequiredEnv("BOOK_STORAGE_S3_SECRET_ACCESS_KEY");
    this.sessionToken = process.env.BOOK_STORAGE_S3_SESSION_TOKEN?.trim() || null;

    this.endpoint = new URL(process.env.BOOK_STORAGE_S3_ENDPOINT?.trim() || `https://s3.${this.region}.amazonaws.com`);
  }

  async uploadFile(input: StorageUploadInput): Promise<StoredUpload> {
    const extension = path.extname(input.fileName).toLowerCase();
    const key = path.posix.join(input.folder, `${randomUUID()}${extension}`);
    const visibility = input.visibility ?? "private";
    const bucket = visibility === "public" ? this.publicBucket : this.privateBucket;

    await this.sendObjectRequest({
      method: "PUT",
      bucket,
      key,
      body: input.bytes,
      contentType: input.mimeType,
    });

    const publicUrl = visibility === "public" ? this.resolvePublicUrl({ key, bucket, region: this.region }) : null;

    return {
      pointer: {
        key,
        bucket,
        region: this.region,
        publicUrl: publicUrl ?? undefined,
      },
      publicUrl,
    };
  }

  async deleteFile(pointer: BookAssetPointer): Promise<void> {
    const bucket = pointer.bucket || this.privateBucket;

    await this.sendObjectRequest({
      method: "DELETE",
      bucket,
      key: pointer.key,
    });
  }

  resolvePublicUrl(pointer: BookAssetPointer): string | null {
    if (pointer.publicUrl) {
      return pointer.publicUrl;
    }

    if (!this.publicBaseUrl) {
      return null;
    }

    return `${this.publicBaseUrl.replace(/\/+$/, "")}/${pointer.key.replace(/^\/+/, "")}`;
  }

  async createSignedAssetUrl(input: SignedAssetUrlInput): Promise<string | null> {
    const bucket = input.pointer.bucket || this.privateBucket;
    const expiresIn = input.expiresInSeconds ?? this.signedUrlExpirySeconds;
    const date = new Date();
    const amzDate = toAmzDate(date);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const url = this.buildObjectUrl(bucket, input.pointer.key);
    const host = url.host;

    const query = new URLSearchParams();
    query.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
    query.set("X-Amz-Credential", `${this.accessKeyId}/${credentialScope}`);
    query.set("X-Amz-Date", amzDate);
    query.set("X-Amz-Expires", String(Math.min(Math.max(1, Math.floor(expiresIn)), 3600)));
    query.set("X-Amz-SignedHeaders", "host");
    query.set("response-content-disposition", `${input.disposition}; filename*=UTF-8''${encodeURIComponent(input.fileName)}`);

    if (input.mimeType) {
      query.set("response-content-type", input.mimeType);
    }

    if (this.sessionToken) {
      query.set("X-Amz-Security-Token", this.sessionToken);
    }

    const canonicalRequest = [
      "GET",
      url.pathname,
      normalizeQuery(query),
      `host:${host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      hashSha256(canonicalRequest),
    ].join("\n");

    const signature = signSignature(this.secretAccessKey, dateStamp, this.region, stringToSign);
    query.set("X-Amz-Signature", signature);
    url.search = query.toString();

    return url.toString();
  }

  private buildObjectUrl(bucket: string, key: string) {
    const url = new URL(this.endpoint.toString());
    const normalizedKey = key.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(bucket)}/${normalizedKey}`;
    return url;
  }

  private async sendObjectRequest(input: {
    method: "PUT" | "DELETE";
    bucket: string;
    key: string;
    body?: Uint8Array;
    contentType?: string;
  }) {
    const date = new Date();
    const amzDate = toAmzDate(date);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const url = this.buildObjectUrl(input.bucket, input.key);
    const host = url.host;

    const payloadHash = input.body ? hashSha256(input.body) : hashSha256("");

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    if (input.contentType) {
      headers["content-type"] = input.contentType;
    }

    if (this.sessionToken) {
      headers["x-amz-security-token"] = this.sessionToken;
    }

    const sortedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedHeaderKeys.map((key) => `${key}:${headers[key]}\n`).join("");
    const signedHeaders = sortedHeaderKeys.join(";");

    const canonicalRequest = [
      input.method,
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      hashSha256(canonicalRequest),
    ].join("\n");

    const signature = signSignature(this.secretAccessKey, dateStamp, this.region, stringToSign);

    headers.Authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, {
      method: input.method,
      headers,
      body: input.body ? Buffer.from(input.body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Storage request failed with status ${response.status}`);
    }
  }
}

function hashSha256(input: string | Uint8Array) {
  return createHash("sha256").update(input).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data).digest();
}

function signSignature(secret: string, dateStamp: string, region: string, stringToSign: string) {
  const kDate = hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, "s3");
  const kSigning = hmacSha256(kService, "aws4_request");
  return createHmac("sha256", kSigning).update(stringToSign).digest("hex");
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function normalizeQuery(params: URLSearchParams) {
  return Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function resolveSignedUrlExpiry(rawValue: string | undefined) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 60;
  }

  return Math.min(Math.trunc(parsed), 3600);
}

function readRequiredEnv(key: string) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required storage environment variable: ${key}`);
  }

  return value;
}

export const resolveStorageProviderFromEnv = (): StorageProviderKey => {
  const configuredProvider = process.env.BOOK_STORAGE_PROVIDER?.toLowerCase();

  if (configuredProvider === "s3" || configuredProvider === "r2") {
    return configuredProvider;
  }

  return "local";
};

export const createStorageProvider = (providerKey?: StorageProviderKey): StorageProviderAdapter => {
  const provider = providerKey ?? resolveStorageProviderFromEnv();

  if (provider === "s3" || provider === "r2") {
    return new S3CompatibleStorageProvider(provider);
  }

  return new LocalStorageProvider();
};
