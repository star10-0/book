import { randomUUID } from "node:crypto";
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
};

export type StoredUpload = {
  pointer: BookAssetPointer;
  publicUrl: string | null;
};

export interface StorageProviderAdapter {
  readonly key: StorageProviderKey;
  uploadFile(input: StorageUploadInput): Promise<StoredUpload>;
  deleteFile(pointer: BookAssetPointer): Promise<void>;
  resolvePublicUrl(pointer: BookAssetPointer): string | null;
}

class CloudProviderPlaceholder implements StorageProviderAdapter {
  readonly key: Extract<StorageProviderKey, "s3" | "r2">;

  constructor(key: Extract<StorageProviderKey, "s3" | "r2">) {
    this.key = key;
  }

  async uploadFile(): Promise<StoredUpload> {
    throw new Error(`Storage provider '${this.key}' is not configured yet.`);
  }

  async deleteFile(): Promise<void> {
    return;
  }

  resolvePublicUrl(): string | null {
    return null;
  }
}

class LocalStorageProvider implements StorageProviderAdapter {
  readonly key = "local" as const;

  async uploadFile(input: StorageUploadInput): Promise<StoredUpload> {
    const { writeFile, mkdir } = await import("node:fs/promises");

    const extension = path.extname(input.fileName).toLowerCase();
    const key = path.posix.join(input.folder, `${randomUUID()}${extension}`);
    const relativePublicPath = path.posix.join("uploads", key);
    const absolutePath = path.join(process.cwd(), "public", relativePublicPath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes);

    const publicUrl = `/${relativePublicPath}`;

    return {
      pointer: {
        key,
        publicUrl,
      },
      publicUrl,
    };
  }

  async deleteFile(pointer: BookAssetPointer): Promise<void> {
    const { rm } = await import("node:fs/promises");
    const absolutePath = path.join(process.cwd(), "public", "uploads", pointer.key);

    await rm(absolutePath, { force: true });
  }

  resolvePublicUrl(pointer: BookAssetPointer): string | null {
    return pointer.publicUrl ?? `/uploads/${pointer.key}`;
  }
}

export const resolveStorageProviderFromEnv = (): StorageProviderKey => {
  const configuredProvider = process.env.BOOK_STORAGE_PROVIDER?.toLowerCase();

  if (configuredProvider === "s3" || configuredProvider === "r2") {
    return configuredProvider;
  }

  return "local";
};

export const createStorageProvider = (): StorageProviderAdapter => {
  const provider = resolveStorageProviderFromEnv();

  if (provider === "s3" || provider === "r2") {
    return new CloudProviderPlaceholder(provider);
  }

  return new LocalStorageProvider();
};
